<?php

namespace App\Services;

use App\Models\Lead;
use App\Models\Task;
use App\Models\User;
use App\Models\Quotation;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UserService extends CrudService
{
    protected string $modelClass = User::class;

    protected array $searchColumns = ['name', 'email', 'phone', 'designation'];

    protected array $relations = ['role'];

    public function __construct()
    {
        if (! Schema::hasColumn('users', 'designation')) {
            $this->searchColumns = ['name', 'email', 'phone'];
        }
    }

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
        $data = $this->sanitizeForCurrentSchema($data);

        return User::create($data)->load($this->relations);
    }

    public function update($model, array $data): User
    {
        if (! empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $data = $this->sanitizeForCurrentSchema($data);
        $model->update($data);

        return $model->refresh()->load($this->relations);
    }

    public function toggleStatus($model, bool $isActive): User
    {
        $model->update(['is_active' => $isActive]);

        return $model->refresh()->load($this->relations);
    }

    public function deleteAndReassign(User $user, User $replacement, ?User $actor = null): void
    {
        if ($actor?->is($user)) {
            throw ValidationException::withMessages([
                'user' => ['You cannot delete your own logged-in account.'],
            ]);
        }

        if ($user->is($replacement)) {
            throw ValidationException::withMessages([
                'replacement_user_id' => ['The replacement must be a different user.'],
            ]);
        }

        DB::transaction(function () use ($user, $replacement): void {
            Lead::query()
                ->where('assigned_to', $user->id)
                ->update(['assigned_to' => $replacement->id]);

            Task::query()
                ->where('assigned_to', $user->id)
                ->update(['assigned_to' => $replacement->id]);

            Quotation::query()
                ->where('created_by', $user->id)
                ->update(['created_by' => $replacement->id]);

            $user->delete();
        });
    }

    protected function applyFilters(Builder $query, Request $request): Builder
    {
        return $query->when($request->filled('role_id'), fn (Builder $q) => $q->where('role_id', $request->integer('role_id')));
    }

    private function sanitizeForCurrentSchema(array $data): array
    {
        if (! Schema::hasColumn('users', 'designation')) {
            unset($data['designation']);
        }

        return $data;
    }
}
