<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

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

    public function delete(Model $model): void
    {
        $model->delete();
    }

    public function reorder(array $items): void
    {
        $orders = [];

        foreach ($items as $item) {
            $orders[(int) $item['id']] = (int) $item['display_order'];
        }

        if ($orders === []) {
            return;
        }

        $model = new $this->modelClass();
        $connection = $model->getConnection();
        $grammar = $connection->getQueryGrammar();
        $table = $grammar->wrapTable($model->getTable());
        $key = $grammar->wrap($model->getKeyName());
        $displayOrder = $grammar->wrap('display_order');
        $cases = [];
        $bindings = [];

        foreach ($orders as $id => $order) {
            $cases[] = 'WHEN ? THEN ?';
            $bindings[] = $id;
            $bindings[] = $order;
        }

        $placeholders = implode(', ', array_fill(0, count($orders), '?'));
        $timestampAssignment = '';

        if ($model->usesTimestamps()) {
            $updatedAt = $grammar->wrap($model->getUpdatedAtColumn());
            $timestampAssignment = ", {$updatedAt} = ?";
            $bindings[] = $model->freshTimestampString();
        }

        $bindings = [...$bindings, ...array_keys($orders)];

        $connection->update(
            "UPDATE {$table} SET {$displayOrder} = CASE {$key} ".implode(' ', $cases)." ELSE {$displayOrder} END{$timestampAssignment} WHERE {$key} IN ({$placeholders})",
            $bindings
        );
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
