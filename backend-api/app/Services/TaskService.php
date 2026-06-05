<?php

namespace App\Services;

use App\Models\Task;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class TaskService extends CrudService
{
    protected string $modelClass = Task::class;

    protected array $searchColumns = ['name', 'description'];

    protected array $relations = ['assignedUser'];

    public function paginate(Request $request): LengthAwarePaginator
    {
        return $this->query($request)
            ->orderByRaw('due_date is null')
            ->orderBy('due_date')
            ->latest('id')
            ->paginate((int) $request->integer('per_page', 15));
    }

    protected function applyFilters(Builder $query, Request $request): Builder
    {
        return $query
            ->when(
                $request->filled('status'),
                fn (Builder $builder) => $builder->where('status', $request->string('status')->toString())
            )
            ->when(
                $request->filled('assigned_to'),
                fn (Builder $builder) => $builder->where('assigned_to', $request->integer('assigned_to'))
            );
    }
}
