<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class ActivityLogService
{
    public function paginate(Request $request): LengthAwarePaginator
    {
        return ActivityLog::query()
            ->with('user:id,name,email')
            ->when($request->filled('module'), fn (Builder $query) => $query->where('module', $request->string('module')->toString()))
            ->when($request->filled('entity_type'), fn (Builder $query) => $query->where('entity_type', $request->string('entity_type')->toString()))
            ->when($request->filled('from_date'), fn (Builder $query) => $query->whereDate('created_at', '>=', $request->date('from_date')))
            ->when($request->filled('to_date'), fn (Builder $query) => $query->whereDate('created_at', '<=', $request->date('to_date')))
            ->when($request->filled('user_id'), fn (Builder $query) => $query->where('created_by', $request->integer('user_id')))
            ->latest('created_at')
            ->latest('id')
            ->paginate((int) $request->integer('per_page', 25));
    }
}
