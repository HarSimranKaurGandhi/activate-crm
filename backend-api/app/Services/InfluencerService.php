<?php

namespace App\Services;

use App\Models\Influencer;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class InfluencerService extends CrudService
{
    protected string $modelClass = Influencer::class;

    protected array $searchColumns = ['name', 'phone', 'email', 'company_name', 'city'];

    protected array $relations = ['assignedUser:id,name,email,phone,designation', 'loginUser:id,email', 'typeDefinition'];

    public function paginate(Request $request): LengthAwarePaginator
    {
        return $this->query($request)
            ->withCount('leads')
            ->orderBy('name')
            ->orderBy('id')
            ->paginate((int) $request->integer('per_page', 15));
    }

    public function dropdown(Request $request)
    {
        return $this->query($request)
            ->where('is_active', true)
            ->withCount('leads')
            ->orderBy('name')
            ->limit(100)
            ->get();
    }

    protected function applyFilters(Builder $query, Request $request): Builder
    {
        return $query->when(
            $request->filled('assigned_to'),
            fn (Builder $builder) => $builder->where('assigned_to', $request->integer('assigned_to'))
        );
    }
}
