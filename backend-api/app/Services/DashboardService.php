<?php

namespace App\Services;

use App\Models\Quotation;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class DashboardService
{
    public function quotationSummary(Request $request): array
    {
        $summary = Quotation::query()
            ->when($request->filled('from_date'), fn (Builder $query) => $query->whereDate('quote_date', '>=', $request->date('from_date')))
            ->when($request->filled('to_date'), fn (Builder $query) => $query->whereDate('quote_date', '<=', $request->date('to_date')))
            ->selectRaw('COUNT(*) as total_quotations')
            ->selectRaw("SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as pending_for_approval", ['pending_approval'])
            ->first();

        return [
            'total_quotations' => (int) ($summary->total_quotations ?? 0),
            'pending_for_approval' => (int) ($summary->pending_for_approval ?? 0),
        ];
    }
}
