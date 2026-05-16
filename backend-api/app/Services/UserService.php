<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserService extends CrudService
{
    protected string $modelClass = User::class;

    protected array $searchColumns = ['name', 'email', 'phone', 'designation'];

    protected array $relations = ['role'];

    public function paginate(Request $request): LengthAwarePaginator
    {
        return $this->query($request)
            ->latest('id')
            ->paginate((int) $request->integer('per_page', 15));
    }

    public function dropdown(Request $request)
    {
        return $this->query($request)
            ->orderBy('name')
            ->get();
    }

    public function create(array $data): User
    {
        $data['password'] = Hash::make($data['password']);
        $data['is_active'] = $data['is_active'] ?? true;

        return User::create($data)->load($this->relations);
    }

    public function update($model, array $data): User
    {
        if (! empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $model->update($data);

        return $model->refresh()->load($this->relations);
    }

    public function toggleStatus($model, bool $isActive): User
    {
        $model->update(['is_active' => $isActive]);

        return $model->refresh()->load($this->relations);
    }

    protected function applyFilters(Builder $query, Request $request): Builder
    {
        return $query->when($request->filled('role_id'), fn (Builder $q) => $q->where('role_id', $request->integer('role_id')));
    }
}
