<?php

namespace App\Services;

use App\Models\Task;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class TaskService extends CrudService
{
    protected string $modelClass = Task::class;

    protected array $searchColumns = ['name', 'description'];

    protected array $relations = ['assignedUser'];

    public function paginate(Request $request): LengthAwarePaginator
    {
        return $this->visibleQuery($request)
            ->orderByRaw('due_date is null')
            ->orderBy('due_date')
            ->latest('id')
            ->paginate((int) $request->integer('per_page', 15));
    }

    public function find(int|string $id): Model
    {
        return $this->visibleQuery(request())
            ->with($this->relations)
            ->findOrFail($id);
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

    private function visibleQuery(Request $request): Builder
    {
        $query = $this->query($request);
        $user = $request->user();

        if (! $user instanceof User) {
            return $query;
        }

        $user->loadMissing('role');

        if ($user->hasAnyRole(['admin'])) {
            return $query;
        }

        return $query->where('assigned_to', $user->getKey());
    }
}
