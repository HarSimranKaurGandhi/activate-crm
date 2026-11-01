<?php

namespace App\Http\Controllers\Api\Customers;

use App\Http\Controllers\Api\ApiController;
use App\Models\Customer;
use App\Models\CustomerInvoice;
use App\Models\CustomerOwnedProduct;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class CustomerInvoiceController extends ApiController
{
    public function index(int $id)
    {
        Customer::findOrFail($id);
        return $this->ok('Customer invoices fetched', [
            'invoices' => CustomerInvoice::where('customer_id', $id)->with('products.product')->latest('id')->get()->map(fn ($invoice) => $this->serialize($invoice)),
            'products' => CustomerOwnedProduct::where('customer_id', $id)->with('product')->orderBy('id')->get()->map(fn ($product) => $this->productData($product)),
        ]);
    }

    public function store(Request $request, int $id)
    {
        Customer::findOrFail($id);
        $data = $request->validate([
            'invoice_number' => ['nullable', 'string', 'max:100'],
            'invoice_date' => ['nullable', 'date_format:Y-m-d'],
            'invoice' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'extensions:pdf,jpg,jpeg,png,webp', 'max:10240'],
            'product_ids' => ['sometimes', 'array'],
            'product_ids.*' => ['required', 'integer', 'distinct'],
        ]);
        $path = null;
        try {
            $invoice = DB::transaction(function () use ($request, $id, $data, &$path) {
                // Serialize uploads for the same customer, then check availability under lock.
                Customer::whereKey($id)->lockForUpdate()->firstOrFail();
                $ids = $data['product_ids'] ?? [];
                $products = CustomerOwnedProduct::where('customer_id', $id)->whereKey($ids)->orderBy('id')->lockForUpdate()->get();
                if ($products->count() !== count($ids)) {
                    throw ValidationException::withMessages(['product_ids' => 'Select only products owned by this customer.']);
                }
                if ($products->contains(fn ($product) => $product->customer_invoice_id !== null)) {
                    throw ValidationException::withMessages(['product_ids' => 'One or more selected products are already linked to an invoice. Refresh the available products and try again.']);
                }
                $file = $request->file('invoice');
                $path = $file->store('customer-invoices', 'local');
                if (! $path) throw new \RuntimeException('Unable to store invoice file.');
                $invoice = CustomerInvoice::create([
                    'customer_id' => $id,
                    'invoice_number' => $data['invoice_number'] ?? null,
                    'invoice_date' => $data['invoice_date'] ?? null,
                    'file_path' => $path,
                    'file_name' => mb_substr(basename($file->getClientOriginalName()), 0, 255),
                    'uploaded_by' => $request->user()->id,
                ]);
                CustomerOwnedProduct::where('customer_id', $id)->whereKey($ids)->update(['customer_invoice_id' => $invoice->id]);
                return $invoice->load('products.product');
            });
        } catch (\Throwable $error) {
            if ($path) Storage::disk('local')->delete($path);
            throw $error;
        }
        return $this->ok('Customer invoice uploaded', $this->serialize($invoice), [], 201);
    }

    public function destroy(int $id, int $invoiceId)
    {
        $path = DB::transaction(function () use ($id,$invoiceId) {
            Customer::whereKey($id)->lockForUpdate()->firstOrFail();
            $invoice=CustomerInvoice::where('customer_id',$id)->lockForUpdate()->findOrFail($invoiceId);
            CustomerOwnedProduct::where('customer_id',$id)->where('customer_invoice_id',$invoiceId)->update(['customer_invoice_id'=>null]);
            $path=$invoice->file_path; $invoice->delete();
            return $path;
        });
        Storage::disk('local')->delete($path);
        return $this->ok('Customer invoice deleted');
    }

    public function download(int $id, int $invoiceId)
    {
        $invoice = CustomerInvoice::where('customer_id', $id)->findOrFail($invoiceId);
        abort_unless(Storage::disk('local')->exists($invoice->file_path), 404, 'Invoice file not found.');
        return Storage::disk('local')->download($invoice->file_path, $invoice->file_name, ['X-Content-Type-Options' => 'nosniff']);
    }

    private function productData(CustomerOwnedProduct $product): array
    {
        return [
            'id' => $product->id,
            'name' => $product->product_description ?: ($product->product?->product_name ?? 'Product'),
            'model_number' => $product->product?->model_number,
            'quantity' => $product->quantity,
            'invoice_id' => $product->customer_invoice_id,
        ];
    }

    private function serialize(CustomerInvoice $invoice): array
    {
        return [
            'id' => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'invoice_date' => $invoice->invoice_date?->toDateString(),
            'file_name' => $invoice->file_name,
            'created_at' => $invoice->created_at,
            'products' => $invoice->products->map(fn ($product) => $this->productData($product)),
        ];
    }
}
