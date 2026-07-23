<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Customer;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class LeadService extends CrudService
{
    private const CLOSED_STATUSES = ['closed_success', 'closed_fail'];

    protected string $modelClass = Lead::class;

    protected array $searchColumns = ['name', 'phone', 'email', 'city', 'state', 'country', 'requirement'];

    protected array $relations = ['creator', 'assignedUser'];

    private ?array $activityLogColumns = null;

    private const ACTIVITY_FIELD_LABELS = [
        'lead_source' => 'Lead Source',
        'name' => 'Name',
        'phone' => 'Phone No.',
        'email' => 'Email',
        'address_line_1' => 'Address Line 1',
        'address_line_2' => 'Address Line 2',
        'city' => 'City',
        'state' => 'State',
        'pincode' => 'Pincode',
        'country' => 'Country',
        'requirement' => 'Requirement',
        'expected_order_value' => 'Lead Expected Order Value',
        'expected_closure' => 'Expected Closure',
        'status' => 'Status',
        'tags' => 'Tags',
        'follow_up_date' => 'Follow Up Date',
        'assigned_to' => 'Assigned To',
    ];

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

    public function create(array $data, ?User $actor = null, ?string $ipAddress = null): Model
    {
        return DB::transaction(function () use ($data, $actor, $ipAddress): Model {
            /** @var Lead $lead */
            $lead = parent::create($data);

            $this->syncCustomerForClosedSuccess($lead);
            $this->logActivity(
                $lead,
                'created',
                'Lead created.',
                [],
                $this->serializeLeadValues($lead),
                $actor,
                $ipAddress,
            );

            return $lead->refresh()->load($this->relations);
        });
    }

    public function update(Model $model, array $data, ?User $actor = null, ?string $ipAddress = null): Model
    {
        return DB::transaction(function () use ($model, $data, $actor, $ipAddress): Model {
            /** @var Lead $lead */
            $before = $this->serializeLeadValues($lead = $model);
            $lead = parent::update($model, $data);

            $this->syncCustomerForClosedSuccess($lead);
            $after = $this->serializeLeadValues($lead);
            [$oldValues, $newValues] = $this->diffLeadValues($before, $after);

            if ($oldValues !== [] || $newValues !== []) {
                $changedLabels = array_map(
                    fn (string $field): string => self::ACTIVITY_FIELD_LABELS[$field] ?? $field,
                    array_keys($newValues),
                );

                $this->logActivity(
                    $lead,
                    'updated',
                    'Updated ' . implode(', ', $changedLabels) . '.',
                    $oldValues,
                    $newValues,
                    $actor,
                    $ipAddress,
                );
            }

            return $lead->refresh()->load($this->relations);
        });
    }

    public function activity(int|string $id): Collection
    {
        /** @var Lead $lead */
        $lead = $this->find($id);

        $logs = ActivityLog::query()
            ->with('user:id,name,email')
            ->where('module', 'leads')
            ->where('entity_type', 'lead')
            ->where('entity_id', $lead->id)
            ->latest('created_at')
            ->latest('id')
            ->get()
            ->map(fn (ActivityLog $log): array => [
                'id' => $log->id,
                'action' => $log->action,
                'description' => $log->description,
                'old_values' => $log->old_values ?? [],
                'new_values' => $log->new_values ?? [],
                'actor' => $log->user ? [
                    'id' => $log->user->id,
                    'name' => $log->user->name,
                    'email' => $log->user->email,
                ] : null,
                'occurred_at' => optional($log->created_at)->toISOString(),
            ]);

        if (! $logs->contains(fn (array $entry): bool => $entry['action'] === 'created')) {
            $logs->push([
                'id' => 'lead-created-' . $lead->id,
                'action' => 'created',
                'description' => 'Lead created.',
                'old_values' => [],
                'new_values' => [],
                'actor' => $lead->creator ? [
                    'id' => $lead->creator->id,
                    'name' => $lead->creator->name,
                    'email' => $lead->creator->email,
                ] : null,
                'occurred_at' => optional($lead->created_at)->toISOString(),
            ]);
        }

        return $logs
            ->sortByDesc('occurred_at')
            ->values();
    }

    public function addComment(Lead $lead, string $comment, ?User $actor = null, ?string $ipAddress = null): array
    {
        $activity = $this->logActivity(
            $lead,
            'commented',
            trim($comment),
            [],
            ['comment' => trim($comment)],
            $actor,
            $ipAddress,
        );

        $activity->loadMissing('user:id,name,email');

        return [
            'id' => $activity->id,
            'action' => $activity->action,
            'description' => $activity->description,
            'old_values' => $activity->old_values ?? [],
            'new_values' => $activity->new_values ?? [],
            'actor' => $activity->user ? [
                'id' => $activity->user->id,
                'name' => $activity->user->name,
                'email' => $activity->user->email,
            ] : null,
            'occurred_at' => optional($activity->created_at)->toISOString(),
        ];
    }

    protected function applyFilters(Builder $query, Request $request): Builder
    {
        $includeClosed = $request->boolean('include_closed');
        $leadSources = collect(Arr::wrap($request->input('lead_source')))
            ->filter(fn (mixed $value): bool => filled($value))
            ->values()
            ->all();
        $statuses = collect(Arr::wrap($request->input('status')))
            ->filter(fn (mixed $value): bool => filled($value))
            ->values()
            ->all();
        $assigneeIds = collect(Arr::wrap($request->input('assigned_to')))
            ->filter(fn (mixed $value): bool => filled($value))
            ->map(fn (mixed $value): int => (int) $value)
            ->values()
            ->all();

        return $query
            ->when(
                ! $includeClosed,
                fn (Builder $builder) => $builder->whereNotIn('status', self::CLOSED_STATUSES)
            )
            ->when(
                $leadSources !== [],
                fn (Builder $builder) => $builder->whereIn('lead_source', $leadSources)
            )
            ->when(
                $statuses !== [],
                fn (Builder $builder) => $builder->whereIn('status', $statuses)
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
                $assigneeIds !== [],
                fn (Builder $builder) => $builder->whereIn('assigned_to', $assigneeIds)
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

    private function serializeLeadValues(Lead $lead): array
    {
        return collect(array_keys(self::ACTIVITY_FIELD_LABELS))
            ->mapWithKeys(function (string $field) use ($lead): array {
                return [$field => $this->formatLeadFieldValue($field, $lead->{$field})];
            })
            ->all();
    }

    private function formatLeadFieldValue(string $field, mixed $value): string
    {
        if ($field === 'lead_source') {
            return match ((string) $value) {
                'walk_in' => 'Walk In',
                'reference' => 'Reference',
                'india_mart' => 'India Mart',
                'website' => 'Website',
                default => (string) ($value ?? '-'),
            };
        }

        if ($field === 'status') {
            return match ((string) $value) {
                'new' => 'New (Requirement Confirmed)',
                'enquiry' => 'Enquiry',
                'in_progress' => 'In Progress',
                'on_hold' => 'On Hold',
                'closed_success' => 'Closed - Success',
                'closed_fail' => 'Closed - Fail',
                default => (string) ($value ?? '-'),
            };
        }

        if ($field === 'assigned_to') {
            if (! $value) {
                return '-';
            }

            $user = User::query()->find($value);

            return $user?->name ?: (string) $value;
        }

        if ($field === 'follow_up_date') {
            if (! $value) {
                return '-';
            }

            return (string) optional($value)->format('Y-m-d');
        }

        if ($field === 'tags') {
            if (! is_array($value) || $value === []) {
                return '-';
            }

            $labels = array_map(
                fn (string $tag): string => match ($tag) {
                    'hot' => 'Hot',
                    'premium' => 'Premium',
                    default => $tag,
                },
                $value,
            );

            return implode(', ', $labels);
        }

        return filled($value) ? trim((string) $value) : '-';
    }

    private function diffLeadValues(array $before, array $after): array
    {
        $oldValues = [];
        $newValues = [];

        foreach (self::ACTIVITY_FIELD_LABELS as $field => $label) {
            if (($before[$field] ?? '-') === ($after[$field] ?? '-')) {
                continue;
            }

            $oldValues[$field] = $before[$field] ?? '-';
            $newValues[$field] = $after[$field] ?? '-';
        }

        return [$oldValues, $newValues];
    }

    private function logActivity(
        Lead $lead,
        string $action,
        string $description,
        array $oldValues,
        array $newValues,
        ?User $actor,
        ?string $ipAddress,
    ): ActivityLog {
        $activity = new ActivityLog(Arr::only([
            'module' => 'leads',
            'entity_type' => 'lead',
            'entity_id' => $lead->id,
            'action' => $action,
            'description' => $description,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'created_by' => $actor?->id,
            'ip_address' => $ipAddress,
        ], $this->getActivityLogColumns()));

        $activity->timestamps = $this->usesTimestamps($this->getActivityLogColumns());
        $activity->save();

        return $activity;
    }

    private function getActivityLogColumns(): array
    {
        return $this->activityLogColumns ??= Schema::getColumnListing('activity_logs');
    }

    private function usesTimestamps(array $columns): bool
    {
        return in_array('created_at', $columns, true) && in_array('updated_at', $columns, true);
    }
}
