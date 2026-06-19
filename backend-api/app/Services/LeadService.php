<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LeadService extends CrudService
{
    protected string $modelClass = Lead::class;

    protected array $searchColumns = ['name', 'phone', 'email', 'city', 'state', 'country', 'requirement'];

    protected array $relations = ['creator', 'assignedUser'];

    public function paginate(Request $request): LengthAwarePaginator
    {
        return $this->applyFilters($this->visibleQuery($request), $request)
            ->latest('id')
            ->paginate((int) $request->integer('per_page', 15));
    }

    public function find(int|string $id): Model
    {
        return $this->visibleQuery(request())
            ->with($this->relations)
            ->findOrFail($id);
    }

    public function create(array $data): Model
    {
        return DB::transaction(function () use ($data): Model {
            /** @var Lead $lead */
            $lead = parent::create($data);

            $this->syncCustomerForClosedSuccess($lead);

            return $lead->refresh()->load($this->relations);
        });
    }

    public function update(Model $model, array $data): Model
    {
        return DB::transaction(function () use ($model, $data): Model {
            /** @var Lead $lead */
            $lead = parent::update($model, $data);

            $this->syncCustomerForClosedSuccess($lead);

            return $lead->refresh()->load($this->relations);
        });
    }

    protected function applyFilters(Builder $query, Request $request): Builder
    {
        return $query
            ->when(
                $request->filled('lead_source'),
                fn (Builder $builder) => $builder->where('lead_source', $request->string('lead_source')->toString())
            )
            ->when(
                $request->filled('status'),
                fn (Builder $builder) => $builder->where('status', $request->string('status')->toString())
            )
            ->when(
                $request->filled('tag'),
                fn (Builder $builder) => $builder->whereJsonContains('tags', $request->string('tag')->toString())
            )
            ->when(
                $request->filled('created_by'),
                fn (Builder $builder) => $builder->where('created_by', $request->integer('created_by'))
            )
            ->when(
                $request->filled('assigned_to'),
                fn (Builder $builder) => $builder->where('assigned_to', $request->integer('assigned_to'))
            )
            ->when(
                $request->filled('follow_up_from'),
                fn (Builder $builder) => $builder->whereDate('follow_up_date', '>=', $request->date('follow_up_from'))
            )
            ->when(
                $request->filled('follow_up_to'),
                fn (Builder $builder) => $builder->whereDate('follow_up_date', '<=', $request->date('follow_up_to'))
            );
    }

    private function visibleQuery(Request $request): Builder
    {
        $query = Lead::query()->with($this->relations);

        if ($request->filled('search') && $this->searchColumns !== []) {
            $search = $request->string('search')->toString();
            $query->where(function (Builder $builder) use ($search): void {
                foreach ($this->searchColumns as $column) {
                    $builder->orWhere($column, 'like', "%{$search}%");
                }
            });
        }
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

    private function syncCustomerForClosedSuccess(Lead $lead): void
    {
        if ($lead->status !== 'closed_success') {
            return;
        }

        $customer = Customer::query()
            ->where('phone', $lead->phone)
            ->when(
                filled($lead->email),
                fn (Builder $query) => $query->orWhere('email', $lead->email)
            )
            ->first();

        $payload = [
            'primary_name' => $lead->name ?: "Lead {$lead->phone}",
            'company_name' => null,
            'email' => $lead->email,
            'phone' => $lead->phone,
            'address_line_1' => $lead->address_line_1 ?: 'N/A',
            'address_line_2' => $lead->address_line_2,
            'city' => $lead->city,
            'state' => $lead->state ?: 'N/A',
            'pincode' => $lead->pincode,
            'country' => $lead->country ?: 'India',
            'notes' => $lead->requirement ?: null,
            'is_active' => true,
        ];

        if ($customer) {
            $customer->update([
                'primary_name' => $customer->primary_name ?: $payload['primary_name'],
                'company_name' => $customer->company_name ?: $payload['company_name'],
                'email' => $customer->email ?: $payload['email'],
                'phone' => $customer->phone ?: $payload['phone'],
                'address_line_1' => $customer->address_line_1 ?: $payload['address_line_1'],
                'address_line_2' => $customer->address_line_2 ?: $payload['address_line_2'],
                'city' => $customer->city ?: $payload['city'],
                'state' => $customer->state ?: $payload['state'],
                'pincode' => $customer->pincode ?: $payload['pincode'],
                'country' => $customer->country ?: $payload['country'],
                'notes' => $customer->notes ?: $payload['notes'],
                'is_active' => true,
            ]);

            return;
        }

        Customer::create($payload);
    }
}
