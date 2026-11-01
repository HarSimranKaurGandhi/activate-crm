<?php

namespace App\Services;

use App\Models\Amc;
use App\Models\CompanySetting;
use App\Support\PublicAsset;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AmcPdfService
{
    public function renderProposal(Amc $amc): array
    {
        if (! in_array($amc->status, ['new', 'proposal'], true)) {
            throw ValidationException::withMessages([
                'amc' => 'AMC proposal documents are available for New and Proposal AMCs.',
            ]);
        }

        return $this->render($amc, 'proposal');
    }

    public function renderDetails(Amc $amc): array
    {
        if ($amc->status !== 'active') {
            throw ValidationException::withMessages([
                'amc' => 'AMC detail documents are available only for Active AMCs.',
            ]);
        }

        return $this->render($amc, 'details');
    }

    private function render(Amc $amc, string $documentType): array
    {
        if (! app()->bound('dompdf.wrapper')) {
            throw new \RuntimeException(
                'DomPDF is not installed. SSH to the server, run: composer install --no-dev --optimize-autoloader'
            );
        }

        $amc->load(['customer', 'items', 'visits']);
        $company = CompanySetting::query()->first();
        $baseDir = storage_path('app/pdf-temp');
        File::ensureDirectoryExists($baseDir);
        $pdfPath = $baseDir.'/amc_'.$documentType.'_'.$amc->getKey().'_'.uniqid('', true).'.pdf';

        $payload = [
            'document_type' => $documentType,
            'document_title' => $documentType === 'proposal' ? 'AMC Proposal' : 'AMC Details',
            'number' => $amc->amc_number,
            'type' => strtoupper((string) $amc->amc_type),
            'status' => ucfirst((string) $amc->status),
            'start_date' => optional($amc->start_date)->format('d M Y') ?: '-',
            'end_date' => optional($amc->end_date)->format('d M Y') ?: '-',
            'yearly_visits' => (int) $amc->yearly_visits,
            'visits_done' => (int) $amc->visits_done,
            'additional_comments' => trim((string) $amc->additional_comments),
            'additional_charges' => $this->money($amc->additional_charges),
            'total_charges' => $this->money(
                (float) $amc->items->sum('amc_charges') + (float) $amc->additional_charges
            ),
            'customer' => [
                'name' => $amc->customer?->company_name ?: $amc->customer?->primary_name ?: 'Customer',
                'contact_name' => $amc->customer?->company_name ? ($amc->customer?->primary_name ?: '') : '',
                'phone' => $amc->customer?->phone ?: '',
                'email' => $amc->customer?->email ?: '',
                'address' => collect([
                    $amc->customer?->address_line_1,
                    $amc->customer?->address_line_2,
                    $amc->customer?->city,
                    $amc->customer?->state,
                    $amc->customer?->pincode,
                    $amc->customer?->country,
                ])->filter()->implode(', '),
            ],
            'items' => $amc->items->values()->map(fn ($item, int $index) => [
                'number' => $index + 1,
                'machine_name' => $item->machine_name,
                'brand' => $item->brand ?: '-',
                'model_number' => $item->model_number ?: '-',
                'charges' => $this->money($item->amc_charges),
            ])->all(),
            'visits' => $amc->visits->sortBy('visit_number')->values()->map(fn ($visit) => [
                'number' => (int) $visit->visit_number,
                'scheduled_date' => optional($visit->scheduled_date)->format('d M Y') ?: '-',
                'status' => ucfirst((string) $visit->status),
                'completed_at' => optional($visit->completed_at)->format('d M Y') ?: '-',
            ])->all(),
        ];

        $configuredCompanyName = trim((string) ($company?->company_name ?: ''));
        $companyName = Str::contains(Str::lower($configuredCompanyName), 'r3m ventures')
            ? $configuredCompanyName
            : 'R3M Ventures';

        $companyPayload = [
            'name' => $companyName,
            'logo_src' => $this->assetSource($company?->logo_path),
            'registered_address' => collect([
                $company?->address_line_1,
                $company?->address_line_2,
                $company?->city,
                $company?->state,
                $company?->pincode,
                $company?->country,
            ])->filter()->implode(', '),
            'gstin' => trim((string) ($company?->gst_number ?: '')),
            'phone' => trim((string) ($company?->phone ?: '')),
            'email' => trim((string) ($company?->email ?: '')),
        ];

        try {
            app('dompdf.wrapper')
                ->loadHTML(view('pdf.amc-document', ['amc' => $payload, 'company' => $companyPayload])->render())
                ->setPaper('a4', 'portrait')
                ->setOption([
                    'isRemoteEnabled' => true,
                    'isHtml5ParserEnabled' => true,
                    'defaultFont' => 'DejaVu Sans',
                ])
                ->save($pdfPath);
        } catch (\Throwable $exception) {
            File::delete($pdfPath);
            throw $exception;
        }

        return [
            'path' => $pdfPath,
            'filename' => $this->downloadFilename($amc, $documentType),
        ];
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

        $mime = mime_content_type($fullPath) ?: 'application/octet-stream';

        return 'data:'.$mime.';base64,'.base64_encode((string) file_get_contents($fullPath));
    }

    private function money(mixed $value): string
    {
        $amount = round((float) $value, 2);
        $sign = $amount < 0 ? '-' : '';
        [$integerPart, $decimalPart] = explode('.', number_format(abs($amount), 2, '.', ''), 2);

        if (strlen($integerPart) > 3) {
            $lastThree = substr($integerPart, -3);
            $remaining = substr($integerPart, 0, -3);
            $remaining = preg_replace('/\B(?=(\d{2})+(?!\d))/', ',', $remaining) ?? $remaining;
            $integerPart = $remaining.','.$lastThree;
        }

        return '₹'.$sign.$integerPart.'.'.$decimalPart;
    }

    private function downloadFilename(Amc $amc, string $documentType): string
    {
        $clientName = trim((string) ($amc->customer?->company_name ?: $amc->customer?->primary_name ?: 'Customer'));
        $label = $documentType === 'proposal' ? 'AMC Proposal' : 'AMC Details';
        $filename = trim($label.' '.$clientName.' '.$amc->amc_number);
        $filename = preg_replace('/[\/\\\\]+/', '-', $filename) ?? $filename;
        $filename = preg_replace('/[^A-Za-z0-9 _.-]+/', ' ', $filename) ?? $filename;
        $filename = preg_replace('/\s+/', ' ', $filename) ?? $filename;

        return Str::limit(trim($filename, " .-_"), 180, '').'.pdf';
    }
}
