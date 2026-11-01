<?php

namespace App\Services;

use App\Models\CompanyBankDetail;
use App\Models\CompanySetting;
use App\Models\Dispatch;
use App\Models\TaxInvoice;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BillingService
{
    public function __construct(private InvoiceCalculator $calculator) {}

    public function source(int|string $id): array
    {
        $dispatch = Dispatch::with(['customer', 'items.product.brand', 'items.product.measurementUnit'])->findOrFail($id);
        $this->ensureEligible($dispatch);
        $company = CompanySetting::query()->first();
        $seller = $company?->only(['company_name', 'address_line_1', 'address_line_2', 'city', 'state', 'pincode', 'country', 'gst_number', 'pan_number', 'phone', 'email']) ?? [];
        $customer = $dispatch->customer?->only(['primary_name', 'company_name', 'gst_number', 'address_line_1', 'address_line_2', 'city', 'state', 'pincode', 'country', 'phone', 'email']) ?? [];
        $bank = $company ? CompanyBankDetail::query()->where('company_setting_id', $company->id)->orderByDesc('is_default')->orderBy('id')->first() : null;
        $source = [
            'dispatch_id' => $dispatch->id, 'dispatch_number' => $dispatch->dispatch_number,
            'dispatch_date' => $dispatch->dispatch_date->format('Y-m-d'), 'customer_id' => $dispatch->customer_id,
            'seller' => $seller, 'customer' => $customer,
            'bank' => $bank?->only(['bank_name', 'account_name', 'account_number', 'ifsc_code', 'branch_name', 'upi_id']),
            'items' => $dispatch->items->map(fn ($item) => [
                'dispatch_item_id' => $item->id, 'product_id' => $item->product_id,
                'description' => $item->product?->product_name ?: $item->requirement, 'requirement' => $item->requirement,
                'model_number' => $item->product?->model_number, 'brand' => $item->product?->brand?->name,
                'unit' => $item->product?->measurementUnit?->code ?: 'Nos',
                'hsn_code' => $item->hsn_code ?: $item->product?->hsn_code ?: '',
                'quantity' => (float) $item->quantity, 'price' => (float) $item->price,
                'discount_percent' => (float) $item->discount_percent, 'discounted_price' => (float) $item->discounted_price,
                'gst_percent' => (float) $item->gst_percent,
            ])->all(),
        ];
        $source['source_token'] = hash('sha256', json_encode($source, JSON_THROW_ON_ERROR));
        $source['suggested_tax_mode'] = CustomerTaxMode::forState($customer['state'] ?? null) ?? '';
        return $source;
    }

    public function preview(array $data): array
    {
        $source = $this->source($data['dispatch_id']);
        if (! hash_equals($source['source_token'], $data['source_token'])) {
            throw ValidationException::withMessages(['dispatch_id' => 'The dispatch or billing details have changed. Reload the dispatch and review the invoice again.']);
        }
        if (empty($source['seller']['company_name']) || empty($source['seller']['gst_number'])) {
            throw ValidationException::withMessages(['company' => 'Add your company name and GSTIN in Settings before creating a tax invoice.']);
        }
        if (Carbon::parse($data['invoice_date'])->lt(Carbon::parse($source['dispatch_date']))) {
            throw ValidationException::withMessages(['invoice_date' => 'Invoice date cannot be before the dispatch slip date.']);
        }
        $overrides = collect($data['hsn_codes'] ?? [])->keyBy('dispatch_item_id');
        $items = array_map(function ($item) use ($overrides) {
            if (! $item['hsn_code']) $item['hsn_code'] = $overrides->get($item['dispatch_item_id'])['hsn_code'] ?? '';
            return $item;
        }, $source['items']);
        $data['tax_mode'] = CustomerTaxMode::forState($source['customer']['state'] ?? null) ?? $data['tax_mode'];
        unset($source['source_token'], $source['suggested_tax_mode']);
        return array_merge($source, [
            'invoice_date' => $data['invoice_date'], 'due_date' => $data['due_date'] ?? null,
            'place_of_supply' => trim($data['place_of_supply']), 'tax_mode' => $data['tax_mode'],
            'notes' => trim($data['notes'] ?? ''),
        ], $this->calculator->calculate($items, $data['tax_mode']));
    }

    public function convert(array $data, ?User $actor): TaxInvoice
    {
        return DB::transaction(function () use ($data, $actor) {
            $dispatch = Dispatch::query()->lockForUpdate()->findOrFail($data['dispatch_id']);
            $snapshot = $this->preview($data);
            $date = Carbon::parse($data['invoice_date']);
            $year = $date->month >= 4 ? $date->year : $date->year - 1;
            $financialYear = $year.'-'.substr((string) ($year + 1), -2);
            DB::table('invoice_sequences')->insertOrIgnore(['financial_year' => $financialYear, 'last_number' => 0]);
            $sequence = DB::table('invoice_sequences')->where('financial_year', $financialYear)->lockForUpdate()->first();
            $next = $sequence->last_number + 1;
            if ($next > 99999) throw ValidationException::withMessages(['invoice' => 'Invoice sequence exhausted for this financial year.']);
            DB::table('invoice_sequences')->where('financial_year', $financialYear)->update(['last_number' => $next]);
            $number = sprintf('INV/%s/%05d', substr((string) $year, -2).'-'.substr((string) ($year + 1), -2), $next);
            $invoice = TaxInvoice::create([
                'invoice_number' => $number, 'dispatch_id' => $dispatch->id, 'customer_id' => $dispatch->customer_id,
                'invoice_date' => $data['invoice_date'], 'due_date' => $data['due_date'] ?? null,
                'place_of_supply' => $snapshot['place_of_supply'], 'tax_mode' => $snapshot['tax_mode'], 'snapshot' => $snapshot,
                'taxable_total' => $snapshot['totals']['taxable_value'], 'tax_total' => $snapshot['totals']['tax_amount'],
                'grand_total' => $snapshot['totals']['grand_total'], 'created_by' => $actor?->id,
            ]);
            $dispatch->update(['status' => 'invoiced']);
            return $invoice;
        }, 3);
    }

    private function ensureEligible(Dispatch $dispatch): void
    {
        if ($dispatch->status !== 'new' || $dispatch->invoice_path || TaxInvoice::where('dispatch_id', $dispatch->id)->exists()) {
            throw ValidationException::withMessages(['dispatch_id' => 'Only a NEW dispatch slip without an invoice can be converted to a tax invoice.']);
        }
        if ($dispatch->items->isEmpty()) throw ValidationException::withMessages(['dispatch_id' => 'The dispatch slip has no items.']);
    }
}
