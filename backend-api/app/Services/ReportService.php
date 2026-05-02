<?php

namespace App\Services;

use App\Models\Quotation;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class ReportService
{
    public function quotationReport(Request $request): LengthAwarePaginator
    {
        return $this->quotationQuery($request)
            ->latest('quote_date')
            ->latest('id')
            ->paginate((int) $request->integer('per_page', 25));
    }

    public function quotationExport(Request $request): array
    {
        $rows = $this->quotationQuery($request)
            ->latest('quote_date')
            ->latest('id')
            ->limit(5000)
            ->get();

        return [
            'format' => 'json_csv_ready',
            'filename' => 'quotation-report-' . now()->format('Y-m-d-His') . '.csv',
            'headers' => $this->quotationExportHeaders(),
            'rows' => $rows->map(fn (Quotation $quotation): array => $this->quotationExportRow($quotation))->values(),
            'meta' => [
                'row_count' => $rows->count(),
                'max_rows' => 5000,
                'generated_at' => now()->toISOString(),
                'filters' => $request->only(['from_date', 'to_date', 'status', 'customer_id', 'created_by']),
            ],
        ];
    }

    private function quotationQuery(Request $request): Builder
    {
        return Quotation::query()
            ->with([
                'customer:id,primary_name,company_name,phone,email',
                'creator:id,name,email',
            ])
            ->when($request->filled('from_date'), fn (Builder $query) => $query->whereDate('quote_date', '>=', $request->date('from_date')))
            ->when($request->filled('to_date'), fn (Builder $query) => $query->whereDate('quote_date', '<=', $request->date('to_date')))
            ->when($request->filled('status'), fn (Builder $query) => $query->where('status', $request->string('status')->toString()))
            ->when($request->filled('customer_id'), fn (Builder $query) => $query->where('customer_id', $request->integer('customer_id')))
            ->when($request->filled('created_by'), fn (Builder $query) => $query->where('created_by', $request->integer('created_by')));
    }

    private function quotationExportHeaders(): array
    {
        return [
            'quotation_number',
            'quote_date',
            'valid_until',
            'status',
            'customer_name',
            'company_name',
            'salesperson_name',
            'created_by',
            'subtotal_before_discount',
            'total_line_discount',
            'subtotal_after_discount',
            'total_adjustments',
            'total_tax',
            'grand_total',
        ];
    }

    private function quotationExportRow(Quotation $quotation): array
    {
        return [
            'quotation_number' => $quotation->quotation_number,
            'quote_date' => optional($quotation->quote_date)->toDateString(),
            'valid_until' => optional($quotation->valid_until)->toDateString(),
            'status' => $quotation->status,
            'customer_name' => $quotation->customer?->primary_name,
            'company_name' => $quotation->customer?->company_name,
            'salesperson_name' => $quotation->salesperson_name,
            'created_by' => $quotation->creator?->name,
            'subtotal_before_discount' => $quotation->subtotal_before_discount,
            'total_line_discount' => $quotation->total_line_discount,
            'subtotal_after_discount' => $quotation->subtotal_after_discount,
            'total_adjustments' => $quotation->total_adjustments,
            'total_tax' => $quotation->total_tax,
            'grand_total' => $quotation->grand_total,
        ];
    }
}
