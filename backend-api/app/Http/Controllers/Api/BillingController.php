<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\TaxInvoiceRequest;
use App\Models\Dispatch;
use App\Models\TaxInvoice;
use App\Services\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BillingController extends ApiController
{
    public function __construct(private BillingService $billing)
    {
        $this->middleware(function (Request $request, \Closure $next) {
            $user = $request->user();
            abort_unless($user && ($user->hasAnyRole(['admin']) || $user->modulePermissions()->where('module', 'billing')->where('can_view', true)->exists()), 403, 'You do not have access to Billing and Payments.');
            return $next($request);
        });
    }

    public function dispatches(Request $request): JsonResponse
    {
        $data = $request->validate(['search' => ['nullable', 'string', 'max:100'], 'per_page' => ['sometimes', 'integer', 'min:1', 'max:100']]);
        $query = Dispatch::query()->with('customer:id,primary_name,company_name')->where('status', 'new')->whereNull('invoice_path')
            ->whereDoesntHave('taxInvoice');
        if (! empty($data['search'])) $query->where(fn ($q) => $q->where('dispatch_number', 'like', '%'.$data['search'].'%')->orWhereHas('customer', fn ($c) => $c->where('primary_name', 'like', '%'.$data['search'].'%')->orWhere('company_name', 'like', '%'.$data['search'].'%')));
        return $this->paginated('Dispatch slips ready for billing', $query->latest('id')->paginate($data['per_page'] ?? 15));
    }

    public function source(int|string $id): JsonResponse { return $this->ok('Dispatch billing details', $this->billing->source($id)); }
    public function preview(TaxInvoiceRequest $request): JsonResponse { return $this->ok('Tax invoice preview', $this->billing->preview($request->validated())); }

    public function store(TaxInvoiceRequest $request): JsonResponse
    {
        $invoice = $this->billing->convert($request->validated(), $request->user());
        return $this->ok('Tax invoice created', $this->data($invoice), [], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate(['search' => ['nullable', 'string', 'max:100'], 'per_page' => ['sometimes', 'integer', 'min:1', 'max:100']]);
        $query = TaxInvoice::query();
        if (! empty($data['search'])) $query->where(fn ($q) => $q->where('invoice_number', 'like', '%'.$data['search'].'%')
            ->orWhere('snapshot->dispatch_number', 'like', '%'.$data['search'].'%')
            ->orWhere('snapshot->customer->company_name', 'like', '%'.$data['search'].'%')
            ->orWhere('snapshot->customer->primary_name', 'like', '%'.$data['search'].'%'));
        $page = $query->latest('invoice_date')->latest('id')->paginate($data['per_page'] ?? 15);
        $page->getCollection()->transform(fn ($invoice) => [
            'id' => $invoice->id, 'invoice_number' => $invoice->invoice_number, 'invoice_date' => $invoice->invoice_date->format('Y-m-d'),
            'dispatch_number' => $invoice->snapshot['dispatch_number'],
            'customer_name' => $invoice->snapshot['customer']['company_name'] ?: $invoice->snapshot['customer']['primary_name'],
            'taxable_total' => $invoice->taxable_total, 'tax_total' => $invoice->tax_total, 'grand_total' => $invoice->grand_total,
        ]);
        return $this->paginated('Tax invoices fetched', $page);
    }

    public function show(int|string $id): JsonResponse { return $this->ok('Tax invoice fetched', $this->data(TaxInvoice::findOrFail($id))); }

    public function pdf(int|string $id)
    {
        $invoice = TaxInvoice::findOrFail($id);
        return app('dompdf.wrapper')->loadView('pdf.tax-invoice', ['invoice' => $this->data($invoice)])
            ->setPaper('a4')->setOption(['defaultFont' => 'DejaVu Sans', 'isRemoteEnabled' => false])
            ->download(str_replace('/', '-', $invoice->invoice_number).'.pdf');
    }

    private function data(TaxInvoice $invoice): array
    {
        return $invoice->snapshot + ['id' => $invoice->id, 'invoice_number' => $invoice->invoice_number];
    }
}
