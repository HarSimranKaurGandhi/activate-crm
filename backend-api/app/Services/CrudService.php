<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

abstract class CrudService
{
    protected string $modelClass;

    protected array $searchColumns = [];

    protected array $relations = [];

    public function paginate(Request $request)
    {
        $query = $this->query($request);

        return $query->paginate((int) $request->integer('per_page', 15));
    }

    public function dropdown(Request $request)
    {
        return $this->query($request)
            ->where('is_active', true)
            ->orderBy('display_order')
            ->orderBy('id')
            ->get();
    }

    public function find(int|string $id): Model
    {
        return ($this->modelClass)::with($this->relations)->findOrFail($id);
    }

    public function create(array $data): Model
    {
        return ($this->modelClass)::create($data);
    }

    public function update(Model $model, array $data): Model
    {
        $model->update($data);

        return $model->refresh();
    }

    public function toggleStatus(Model $model, bool $isActive): Model
    {
        $model->update(['is_active' => $isActive]);

        return $model->refresh();
    }

    public function reorder(array $items): void
    {
        DB::transaction(function () use ($items): void {
            foreach ($items as $item) {
                ($this->modelClass)::whereKey($item['id'])->update(['display_order' => $item['display_order']]);
            }
        });
    }

    protected function query(Request $request): Builder
    {
        $query = ($this->modelClass)::query()->with($this->relations);

        if ($request->filled('search') && $this->searchColumns !== []) {
            $search = $request->string('search')->toString();
            $query->where(function (Builder $builder) use ($search): void {
                foreach ($this->searchColumns as $column) {
                    $builder->orWhere($column, 'like', "%{$search}%");
                }
            });
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        return $this->applyFilters($query, $request);
    }

    protected function applyFilters(Builder $query, Request $request): Builder
    {
        return $query;
    }
}
