<?php
namespace App\Services;

use App\Models\Quotation;
use App\Models\CompanySetting;
use App\Models\CompanyBankDetail;
use Illuminate\Validation\ValidationException;

class QuotationProformaService
{
    public function data(Quotation $quotation, string $taxMode): array
    {
        if (!in_array($quotation->status, ['approved', 'locked'], true)) {
            throw ValidationException::withMessages(['status' => 'Proforma invoices are available only for approved or locked quotations.']);
        }
        if (!in_array($taxMode, ['igst', 'cgst_sgst', 'cgst_utgst'], true)) {
            throw ValidationException::withMessages(['tax_mode' => 'Select the tax type.']);
        }
        $quotation->loadMissing(['customer', 'lead', 'items.product', 'adjustments', 'terms']);
        $company = CompanySetting::first();
        $bank = $company ? CompanyBankDetail::where('company_setting_id', $company->id)->orderByDesc('is_default')->first() : null;
        $keys = ['company_name','primary_name','gst_number','pan_number','address_line_1','address_line_2','city','state','pincode','country','phone','email'];
        $seller = array_fill_keys($keys, '');
        $customer = $seller;
        foreach ($keys as $key) {
            $seller[$key] = $company?->$key ?? '';
            $customer[$key] = $quotation->customer?->$key ?: ($quotation->lead?->$key ?? '');
        }
        $taxMode = CustomerTaxMode::forState($customer['state'] ?? null) ?? $taxMode;
        $customer['primary_name'] = $quotation->customer?->primary_name ?: ($quotation->lead?->name ?? '');
        $subtotal = (float)$quotation->subtotal_after_discount;
        $taxableAdjustments = $quotation->adjustments->sum(fn($row) => (float)$row->amount < 0 || $row->is_taxable ? (float)$row->amount : 0);
        $factor = $subtotal > 0 ? max($subtotal + $taxableAdjustments, 0) / $subtotal : 0;
        $items = []; $groups = [];
        $totals = ['taxable_value'=>0, 'tax_amount'=>0, 'cgst_amount'=>0, 'sgst_amount'=>0, 'igst_amount'=>0];
        foreach ($quotation->items as $item) {
            $taxable = round((float)$item->taxable_amount * $factor, 2);
            $tax = (float)$item->tax_amount;
            $cgst = $taxMode !== 'igst' ? round($tax / 2, 2) : 0;
            $sgst = $taxMode !== 'igst' ? round($tax - $cgst, 2) : 0;
            $igst = $taxMode === 'igst' ? $tax : 0;
            $hsn = $item->product?->hsn_code ?: '—';
            $line = ['description'=>$item->product_name, 'requirement'=>$item->additional_information ?: $item->product_name,
                'model_number'=>$item->model_number, 'brand'=>'', 'hsn_code'=>$hsn, 'unit'=>$item->unit,
                'quantity'=>(float)$item->quantity, 'price'=>(float)$item->price_after_discount,
                'discount_percent'=>(float)$item->discount_percent, 'gst_percent'=>(float)$item->gst_percent,
                'taxable_value'=>$taxable, 'tax_amount'=>$tax, 'total'=>round($taxable+$tax,2),
                'cgst_amount'=>$cgst, 'sgst_amount'=>$sgst, 'igst_amount'=>$igst];
            $items[] = $line;
            $key = $hsn.'|'.$item->gst_percent;
            $groups[$key] ??= ['hsn_code'=>$hsn,'gst_percent'=>(float)$item->gst_percent] + array_fill_keys(array_keys($totals),0);
            foreach (array_keys($totals) as $field) {
                $totals[$field] += $line[$field];
                $groups[$key][$field] += $line[$field];
            }
        }
        $grand = (float)$quotation->grand_total;
        $adjustment = round($grand - $totals['taxable_value'] - $totals['tax_amount'], 2);
        $totals['grand_total'] = $grand;
        return ['show_discount_to_customer'=>(bool)$quotation->show_discount_to_customer, 'document_title'=>'PROFORMA INVOICE', 'invoice_number'=>$quotation->quotation_number,
            'date_label'=>'Date', 'invoice_date'=>$quotation->quote_date?->format('Y-m-d'), 'due_date'=>null,
            'dispatch_number'=>null, 'dispatch_date'=>null, 'seller'=>$seller, 'customer'=>$customer,
            'place_of_supply'=>$customer['state'], 'tax_mode'=>$taxMode, 'bank'=>$bank?->toArray(),
            'items'=>$items, 'totals'=>$totals, 'hsn_summary'=>array_values($groups),
            'other_adjustments'=>$adjustment,
            'terms'=>$quotation->terms->sortBy('display_order')->values()->map(fn ($term) => ['content'=>$term->content])->all(),
            'notes'=>trim(($quotation->pricing_mode === 'inclusive_gst' ? "Rates include GST.\n" : '')."Taxable values include applicable quotation adjustments.\n".($quotation->remarks ?? ''))];
    }
}
