<?php

namespace App\Services;

use App\Models\Brand;
use App\Models\CompanyBankDetail;
use App\Models\CompanySetting;
use App\Models\Quotation;
use App\Support\PublicAsset;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\ExecutableFinder;
use Symfony\Component\Process\Process;

class QuotationPdfService
{
    private function maskPhone(?string $value): string
    {
        $phone = trim((string) $value);

        if ($phone === '') {
            return '';
        }

        if (mb_strlen($phone) <= 1) {
            return $phone.'****';
        }

        return mb_substr($phone, 0, 1).'****';
    }

    public function render(Quotation $quotation): array
    {
        $baseDir = storage_path('app/pdf-temp');
        File::ensureDirectoryExists($baseDir);

        $pdfPath = $baseDir.'/quotation_'.$quotation->getKey().'_'.uniqid('', true).'.pdf';
        $html = $this->buildHtml($quotation);

        $driver = $this->resolveDriver();

        try {
            // if ($driver === 'playwright') {
            //     $this->renderWithPlaywright($html, $pdfPath);
            // } else {
                $this->renderWithDompdf($html, $pdfPath);
            // }
        } catch (\Throwable $exception) {
            if ($driver === 'playwright' && $this->canFallbackToDompdf($exception)) {
                Log::warning('Playwright PDF generation failed, falling back to DomPDF', [
                    'quotation_id' => $quotation->getKey(),
                    'message' => $exception->getMessage(),
                ]);

                $this->renderWithDompdf($html, $pdfPath);

                return [
                    'path' => $pdfPath,
                    'filename' => ($quotation->quotation_number ?: 'quotation').'.pdf',
                ];
            }

            Log::error('Quotation PDF generation failed', [
                'quotation_id' => $quotation->getKey(),
                'driver' => $driver,
                'message' => $exception->getMessage(),
            ]);

            throw $exception;
        }

        return [
            'path' => $pdfPath,
            'filename' => ($quotation->quotation_number ?: 'quotation').'.pdf',
        ];
    }

    private function resolveDriver(): string
    {
        $driver = strtolower((string) config('quotation-pdf.driver', 'auto'));

        if ($driver === 'playwright') {
            return $this->canUsePlaywright() ? 'playwright' : 'dompdf';
        }

        if ($driver === 'dompdf') {
            return 'dompdf';
        }

        return $this->canUsePlaywright() ? 'playwright' : 'dompdf';
    }

    private function canUsePlaywright(): bool
    {
        if (! (new ExecutableFinder)->find('node')) {
            return false;
        }

        $frontendRoot = realpath(base_path('..')) ?: base_path('..');
        $browsersRoot = $frontendRoot.'/.playwright-browsers';

        return is_dir($browsersRoot) && count(glob($browsersRoot.'/*')) > 0;
    }

    private function canFallbackToDompdf(\Throwable $exception): bool
    {
        if (! app()->bound('dompdf.wrapper')) {
            return false;
        }

        $message = strtolower($exception->getMessage());

        return str_contains($message, 'node: not found')
            || str_contains($message, 'command not found')
            || str_contains($message, 'exit code: 127')
            || str_contains($message, 'playwright')
            || str_contains($message, 'chromium');
    }

    private function renderWithDompdf(string $html, string $pdfPath): void
    {
        if (! app()->bound('dompdf.wrapper')) {
            throw new \RuntimeException(
                'DomPDF is not installed. SSH to the server, run: composer install --no-dev --optimize-autoloader'
            );
        }

        app('dompdf.wrapper')
            ->loadHTML($html)
            ->setPaper('a4', 'portrait')
            ->setOption([
                'isRemoteEnabled' => true,
                'isHtml5ParserEnabled' => true,
                'defaultFont' => 'DejaVu Sans',
            ])
            ->save($pdfPath);
    }

    private function renderWithPlaywright(string $html, string $pdfPath): void
    {
        $baseDir = dirname($pdfPath);
        $htmlPath = $baseDir.'/'.basename($pdfPath, '.pdf').'.html';

        File::put($htmlPath, $html);

        $frontendRoot = realpath(base_path('..')) ?: base_path('..');

        $process = new Process([
            'node',
            base_path('scripts/render-quotation-pdf.mjs'),
            $htmlPath,
            $pdfPath,
        ], $frontendRoot, [
            'PLAYWRIGHT_BROWSERS_PATH' => $frontendRoot.'/.playwright-browsers',
        ]);
        $process->setTimeout(120);
        $process->mustRun();

        File::delete($htmlPath);
    }

    private function buildHtml(Quotation $quotation): string
    {
        $quotation->loadMissing(['customer', 'items', 'adjustments', 'terms', 'brandBanner']);
        $company = CompanySetting::query()->first();
        $bank = CompanyBankDetail::query()->where('is_default', true)->first() ?? CompanyBankDetail::query()->first();

        $customer = $quotation->customer;
        $gstInclusive = $quotation->pricing_mode === 'inclusive_gst';
        $terms = $quotation->terms->sortBy('display_order')->values();
        $adjustments = $quotation->adjustments->sortBy('display_order')->values();
        $items = $quotation->items->sortBy('sort_order')->values();
        $totalAdjustments = (float) $adjustments->sum('amount');
        $roundOffNetAmount = $quotation->round_off_net_amount_to_customer === null
            ? false
            : (bool) $quotation->round_off_net_amount_to_customer;

        $payload = [
            'number' => $quotation->quotation_number,
            'quote_date_label' => optional($quotation->quote_date)->format('d M Y') ?: '',
            'validity_label' => $quotation->valid_until
                ? optional($quotation->valid_until)->format('d M Y')
                : '30 Days from Date of Issue',
            'status_key' => $this->statusKey($quotation->status),
            'status_label' => $this->statusLabel($quotation->status),
            'requires_watermark' => $quotation->status !== 'approved',
            'show_discount' => (bool) $quotation->show_discount_to_customer,
            'show_mrp' => $quotation->show_mrp_to_customer === null ? true : (bool) $quotation->show_mrp_to_customer,
            'show_item_wise_gst' => $quotation->show_item_wise_gst_to_customer === null ? false : (bool) $quotation->show_item_wise_gst_to_customer,
            'round_off_net_amount' => $roundOffNetAmount,
            'show_uom' => $quotation->show_uom_to_customer === null ? false : (bool) $quotation->show_uom_to_customer,
            'show_brand_banner' => $quotation->show_brand_banner_to_customer === null ? false : (bool) $quotation->show_brand_banner_to_customer,
            'gst_inclusive' => $gstInclusive,
            'tax_amount' => (float) $quotation->total_tax,
            'subtotal_label' => $this->money($quotation->subtotal_after_discount),
            'tax_amount_label' => $this->money(
                $roundOffNetAmount ? round((float) $quotation->total_tax) : (float) $quotation->total_tax,
                $roundOffNetAmount ? 0 : 2
            ),
            'before_tax_total_label' => $this->money((float) $quotation->subtotal_after_discount + $totalAdjustments),
            'grand_total_label' => $this->money($quotation->grand_total),
            'customer' => [
                'primary_name' => $customer?->primary_name ?: '',
                'company_name' => $customer?->company_name ?: '',
                'phone' => $this->maskPhone($customer?->phone),
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
            'items' => $items->map(function ($item) use ($roundOffNetAmount) {
                return [
                    'product_name' => $item->product_name,
                    'model_number' => $item->model_number,
                    'product_image_src' => $this->assetSource($item->product_image_path),
                    'specifications_html' => $this->sanitizeQuotationHtml($item->specifications ?: ''),
                    'edited_price_label' => $this->money(
                        $roundOffNetAmount ? round((float) $item->edited_price) : (float) $item->edited_price,
                        $roundOffNetAmount ? 0 : 2
                    ),
                    'discounted_price_label' => $this->money(
                        $roundOffNetAmount ? round((float) $item->price_after_discount) : (float) $item->price_after_discount,
                        $roundOffNetAmount ? 0 : 2
                    ),
                    'quantity_label' => $this->number($item->quantity),
                    'quantity_with_unit_label' => trim($this->number($item->quantity).' '.strtoupper((string) ($item->unit ?? ''))),
                    'discount_percent_label' => (float) $item->discount_percent > 0 ? $this->number($item->discount_percent).'%' : '-',
                    'gst_percent_label' => $this->number($item->gst_percent).'%',
                    'tax_amount_label' => $this->money(
                        $roundOffNetAmount ? round((float) $item->tax_amount) : (float) $item->tax_amount,
                        $roundOffNetAmount ? 0 : 2
                    ),
                    'net_amount_label' => $this->money(
                        $roundOffNetAmount
                            ? round((float) $item->taxable_amount)
                            : (float) $item->taxable_amount,
                        $roundOffNetAmount ? 0 : 2
                    ),
                    'line_total_label' => $this->money(
                        $roundOffNetAmount
                            ? round((float) $item->line_total)
                            : (float) $item->line_total,
                        $roundOffNetAmount ? 0 : 2
                    ),
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

        $brandBanner = $quotation->brandBanner instanceof Brand ? $quotation->brandBanner : null;

        $companyPayload = [
            'company_name' => $company?->company_name ?: 'Quotation',
            'logo_src' => $this->assetSource($company?->logo_path),
            'letterhead_type' => $this->assetType($company?->letterhead_path),
            'letterhead_src' => $this->assetSource($company?->letterhead_path),
            'brand_banner' => [
                'name' => $brandBanner?->name ?: '',
                'logo_src' => $this->assetSource($brandBanner?->logo),
            ],
            'address_lines' => array_values(array_filter([
                $company?->address_line_1,
                $company?->address_line_2,
                collect([$company?->city, $company?->state])->filter()->implode(', '),
                collect([$company?->pincode, $company?->country])->filter()->implode(', '),
            ])),
            'phone' => $company?->phone ?: null,
            'email' => $company?->email ?: null,
            'gst_number' => $company?->gst_number ?: null,
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

    private function money(mixed $value, int $decimals = 2): string
    {
        $amount = round((float) $value, $decimals);
        $sign = $amount < 0 ? '-' : '';
        $absolute = abs($amount);

        $formatted = number_format($absolute, $decimals, '.', '');
        [$integerPart, $decimalPart] = array_pad(explode('.', $formatted, 2), 2, '');

        if (strlen($integerPart) > 3) {
            $lastThree = substr($integerPart, -3);
            $remaining = substr($integerPart, 0, -3);
            $remaining = preg_replace('/\B(?=(\d{2})+(?!\d))/', ',', $remaining) ?? $remaining;
            $integerPart = $remaining.','.$lastThree;
        }

        return '₹'.$sign.$integerPart.($decimals > 0 ? '.'.$decimalPart : '');
    }

    private function sanitizeQuotationHtml(string $html): string
    {
        if ($html === '') {
            return '';
        }

        $html = preg_replace_callback(
            '/\sstyle=("|\')(.*?)\1/i',
            function (array $matches): string {
                $quote = $matches[1];
                $style = $matches[2];

                $sanitizedRules = collect(explode(';', $style))
                    ->map(fn (string $rule) => trim($rule))
                    ->filter()
                    ->reject(function (string $rule): bool {
                        $property = strtolower(trim(explode(':', $rule, 2)[0] ?? ''));

                        return in_array($property, ['font', 'font-family', 'font-size', 'line-height', 'width', 'min-width', 'max-width'], true);
                    })
                    ->values()
                    ->all();

                if ($sanitizedRules === []) {
                    return '';
                }

                return ' style='.$quote.implode('; ', $sanitizedRules).$quote;
            },
            $html
        ) ?? $html;

        $html = preg_replace('/\s(face|size)=("|\').*?\2/i', '', $html) ?? $html;

        return $html;
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

        $fullPath = PublicAsset::absolutePath($path);

        if (! $fullPath || ! is_file($fullPath)) {
            return null;
        }

        $extension = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));

        if ($extension === 'pdf') {
            return null;
        }

        $mime = mime_content_type($fullPath) ?: 'application/octet-stream';

        return 'data:'.$mime.';base64,'.base64_encode((string) file_get_contents($fullPath));
    }
}
