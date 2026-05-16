<?php

namespace App\Services;

use App\Models\CompanyBankDetail;
use App\Models\CompanySetting;
use App\Models\Quotation;
use Illuminate\Support\Facades\File;
use Symfony\Component\Process\Process;

class QuotationPdfService
{
    public function render(Quotation $quotation): array
    {
        $baseDir = storage_path('app/pdf-temp');
        File::ensureDirectoryExists($baseDir);

        $htmlPath = $baseDir.'/quotation_'.$quotation->getKey().'_'.uniqid('', true).'.html';
        $pdfPath = $baseDir.'/quotation_'.$quotation->getKey().'_'.uniqid('', true).'.pdf';

        File::put($htmlPath, $this->buildHtml($quotation));

        $process = new Process([
            'node',
            base_path('scripts/render-quotation-pdf.mjs'),
            $htmlPath,
            $pdfPath,
        ], base_path('..'));
        $process->setTimeout(120);
        $process->mustRun();

        File::delete($htmlPath);

        return [
            'path' => $pdfPath,
            'filename' => ($quotation->quotation_number ?: 'quotation').'.pdf',
        ];
    }

    private function buildHtml(Quotation $quotation): string
    {
        $quotation->loadMissing(['customer', 'items', 'adjustments', 'terms']);
        $company = CompanySetting::query()->first();
        $bank = CompanyBankDetail::query()->where('is_default', true)->first() ?? CompanyBankDetail::query()->first();

        $customer = $quotation->customer;
        $gstInclusive = $quotation->pricing_mode === 'inclusive_gst';
        $terms = $quotation->terms->sortBy('display_order')->values();
        $adjustments = $quotation->adjustments->sortBy('display_order')->values();
        $items = $quotation->items->sortBy('sort_order')->values();
        $totalAdjustments = (float) $adjustments->sum('amount');

        $payload = [
            'number' => $quotation->quotation_number,
            'quote_date_label' => optional($quotation->quote_date)->format('d M Y') ?: '',
            'status_key' => $this->statusKey($quotation->status),
            'status_label' => $this->statusLabel($quotation->status),
            'requires_watermark' => $quotation->status !== 'approved',
            'show_discount' => (bool) $quotation->show_discount_to_customer,
            'gst_inclusive' => $gstInclusive,
            'tax_amount' => (float) $quotation->total_tax,
            'subtotal_label' => $this->money($quotation->subtotal_after_discount),
            'tax_amount_label' => $this->money($quotation->total_tax),
            'before_tax_total_label' => $this->money((float) $quotation->subtotal_after_discount + $totalAdjustments),
            'grand_total_label' => $this->money($quotation->grand_total),
            'customer' => [
                'primary_name' => $customer?->primary_name ?: '',
                'company_name' => $customer?->company_name ?: '',
                'phone' => $customer?->phone ?: '',
                'email' => $customer?->email ?: '',
                'gst_number' => $customer?->gst_number ?: '',
                'address' => collect([
                    $customer?->address_line_1,
                    $customer?->address_line_2,
                    $customer?->city,
                    $customer?->state,
                    $customer?->pincode,
                    $customer?->country,
                ])->filter()->implode(', '),
            ],
            'salesperson' => [
                'name' => $quotation->salesperson_name ?: '',
                'phone' => $quotation->salesperson_phone ?: '',
                'email' => $quotation->salesperson_email ?: '',
            ],
            'items' => $items->map(function ($item) {
                return [
                    'product_name' => $item->product_name,
                    'model_number' => $item->model_number,
                    'product_image_src' => $this->assetSource($item->product_image_path),
                    'specifications_html' => $item->specifications ?: '',
                    'edited_price_label' => $this->money($item->edited_price),
                    'quantity_label' => $this->number($item->quantity),
                    'discount_percent_label' => (float) $item->discount_percent > 0 ? $this->number($item->discount_percent).'%' : '-',
                    'gst_percent_label' => $this->number($item->gst_percent).'%',
                    'tax_amount_label' => $this->money($item->tax_amount),
                    'line_total_label' => $this->money($item->line_total),
                ];
            })->all(),
            'adjustments' => $adjustments->map(fn ($adjustment) => [
                'name' => $adjustment->name,
                'amount_label' => $this->money($adjustment->amount),
            ])->all(),
            'terms' => $terms->map(fn ($term) => [
                'content' => $term->content,
            ])->all(),
        ];

        $companyPayload = [
            'company_name' => $company?->company_name ?: 'Quotation',
            'letterhead_type' => $this->assetType($company?->letterhead_path),
            'letterhead_src' => $this->assetSource($company?->letterhead_path),
            'details' => array_values(array_filter([
                ['label' => 'Company Name', 'value' => $company?->company_name ?: null],
                ['label' => 'Account No.', 'value' => $bank?->account_number ?: null],
                ['label' => 'IFSC Code', 'value' => $bank?->ifsc_code ?: null],
                ['label' => 'Branch', 'value' => $bank?->branch_name ?: null],
                ['label' => 'Bank Name', 'value' => $bank?->bank_name ?: null],
            ], fn ($detail) => ! empty($detail['value']))),
        ];

        return view('pdf.quotation', [
            'quotation' => $payload,
            'company' => $companyPayload,
        ])->render();
    }

    private function money(mixed $value): string
    {
        return '₹'.number_format((float) $value, 2, '.', ',');
    }

    private function number(mixed $value): string
    {
        return rtrim(rtrim(number_format((float) $value, 2, '.', ''), '0'), '.');
    }

    private function statusLabel(?string $status): string
    {
        return match ($status) {
            'pending_approval' => 'Pending',
            'approved' => 'Approved',
            'rejected' => 'Rejected',
            'revised' => 'Revised',
            default => 'Draft',
        };
    }

    private function statusKey(?string $status): string
    {
        return match ($status) {
            'pending_approval' => 'pending',
            'approved' => 'approved',
            'rejected' => 'rejected',
            'revised' => 'revised',
            default => 'draft',
        };
    }

    private function assetType(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        return strtolower(pathinfo($path, PATHINFO_EXTENSION)) === 'pdf' ? 'pdf' : 'image';
    }

    private function assetSource(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        $fullPath = storage_path('app/public/'.$path);

        if (! is_file($fullPath)) {
            return null;
        }

        $extension = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));

        if ($extension === 'pdf') {
            return 'file://'.str_replace(' ', '%20', $fullPath);
        }

        $mime = mime_content_type($fullPath) ?: 'application/octet-stream';

        return 'data:'.$mime.';base64,'.base64_encode((string) file_get_contents($fullPath));
    }
}
