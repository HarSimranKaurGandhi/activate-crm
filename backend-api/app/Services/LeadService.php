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
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

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
        'failure_reason' => 'Failure Reason',
        'failure_reason_details' => 'Failure Details',
        'tags' => 'Tags',
        'follow_up_date' => 'Follow Up Date',
        'assigned_to' => 'Assigned To',
    ];

    public function paginate(Request $request): LengthAwarePaginator
    {
        $query = $this->applyFilters($this->visibleQuery($request), $request);
        $sortBy = $request->string('sort_by')->toString() ?: 'follow_up_date';
        $direction = $request->string('sort_direction')->toString() === 'desc' ? 'desc' : 'asc';

        if ($sortBy === 'assigned_to') {
            $query->orderBy(
                User::query()->select('name')->whereColumn('users.id', 'leads.assigned_to'),
                $direction
            );
        } elseif ($sortBy === 'follow_up_date') {
            $query
                ->orderByRaw('follow_up_date IS NULL')
                ->orderBy('follow_up_date', $direction);
        } else {
            $query->orderBy($sortBy, $direction);
        }

        return $query
            ->orderByDesc('id')
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
            $normalizedPhone = $this->normalizePhone($data['phone'] ?? null);

            if ($normalizedPhone !== '') {
                $duplicateLead = Lead::query()
                    ->with('assignedUser:id,name')
                    ->whereNotIn('status', self::CLOSED_STATUSES)
                    ->whereNotNull('phone')
                    ->lockForUpdate()
                    ->get(['id', 'phone', 'assigned_to'])
                    ->first(fn (Lead $existing): bool => $this->normalizePhone($existing->phone) === $normalizedPhone);

                if ($duplicateLead) {
                    $assignee = $duplicateLead->assignedUser?->name ?: 'Unassigned';
                    throw ValidationException::withMessages([
                        'phone' => ["A lead already exists with the same phone number and is assigned to {$assignee}."],
                    ]);
                }
            }

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

    private function normalizePhone(?string $phone): string
    {
        return preg_replace('/\D+/', '', trim((string) $phone)) ?? '';
    }

    public function bulkImportCsv(string $path, ?User $actor = null, ?string $ipAddress = null): array
    {
        @set_time_limit(300);

        $handle = fopen($path, 'r');

        if (! $handle) {
            throw ValidationException::withMessages(['file' => ['Unable to read the uploaded CSV file.']]);
        }

        $header = fgetcsv($handle);

        if (! is_array($header)) {
            fclose($handle);
            throw ValidationException::withMessages(['file' => ['The uploaded CSV file is empty.']]);
        }

        $header = array_map(fn ($value): string => $this->normalizeBulkHeader((string) $value), $header);
        $requiredHeaders = ['name', 'phone', 'requirement', 'assigned_to', 'lead_source'];
        $missingHeaders = array_values(array_diff($requiredHeaders, $header));

        if ($missingHeaders !== []) {
            fclose($handle);
            throw ValidationException::withMessages([
                'file' => ['Missing mandatory CSV columns: '.implode(', ', $missingHeaders).'.'],
            ]);
        }

        $results = [];
        $rowNumber = 1;
        $existingPhones = Lead::query()
            ->with('assignedUser:id,name')
            ->whereNotIn('status', self::CLOSED_STATUSES)
            ->whereNotNull('phone')
            ->get(['id', 'phone', 'assigned_to'])
            ->mapWithKeys(fn (Lead $lead): array => [
                $this->normalizePhone($lead->phone) => [
                    'id' => $lead->id,
                    'assignee' => $lead->assignedUser?->name ?: 'Unassigned',
                ],
            ])
            ->all();

        while (($row = fgetcsv($handle)) !== false) {
            $rowNumber++;

            if (count(array_filter($row, fn ($value): bool => trim((string) $value) !== '')) === 0) {
                continue;
            }

            if (count($row) > count($header)) {
                $results[] = $this->bulkFailureResult($rowNumber, '', '', 'CSV row has more values than the header.');
                continue;
            }

            $payload = array_combine($header, array_pad($row, count($header), null));

            if (! is_array($payload)) {
                $results[] = $this->bulkFailureResult($rowNumber, '', '', 'Invalid CSV row structure.');
                continue;
            }

            $data = $this->prepareBulkLeadData($payload, $actor);
            $validator = Validator::make($data, $this->bulkLeadRules(), [
                'phone.digits' => 'Phone number must contain exactly 10 digits.',
                'assigned_to.exists' => 'The assignee user ID does not exist.',
            ]);

            if ($validator->fails()) {
                $results[] = $this->bulkFailureResult(
                    $rowNumber,
                    (string) ($data['name'] ?? ''),
                    (string) ($data['phone'] ?? ''),
                    implode(' ', $validator->errors()->all()),
                );
                continue;
            }

            try {
                $validated = $validator->validated();
                unset($validated['_raw_phone']);

                if (isset($existingPhones[$validated['phone']])) {
                    $results[] = $this->bulkFailureResult(
                        $rowNumber,
                        (string) $validated['name'],
                        (string) $validated['phone'],
                        "A lead already exists with the same phone number and is assigned to {$existingPhones[$validated['phone']]['assignee']}.",
                    );
                    continue;
                }

                $lead = $this->createBulkLead($validated, $actor, $ipAddress);
                $existingPhones[$validated['phone']] = [
                    'id' => $lead->id,
                    'assignee' => $lead->assignedUser?->name ?: 'Unassigned',
                ];
                $results[] = [
                    'row' => $rowNumber,
                    'name' => $lead->name,
                    'phone' => $lead->phone,
                    'status' => 'success',
                    'message' => 'Lead uploaded successfully.',
                    'lead_id' => $lead->id,
                ];
            } catch (ValidationException $exception) {
                $results[] = $this->bulkFailureResult(
                    $rowNumber,
                    (string) ($data['name'] ?? ''),
                    (string) ($data['phone'] ?? ''),
                    implode(' ', Arr::flatten($exception->errors())),
                );
            } catch (Throwable) {
                $results[] = $this->bulkFailureResult(
                    $rowNumber,
                    (string) ($data['name'] ?? ''),
                    (string) ($data['phone'] ?? ''),
                    'Unable to upload this lead.',
                );
            }
        }

        fclose($handle);
        $successful = count(array_filter($results, fn (array $result): bool => $result['status'] === 'success'));

        return [
            'total' => count($results),
            'successful' => $successful,
            'failed' => count($results) - $successful,
            'results' => $results,
        ];
    }

    private function createBulkLead(array $data, ?User $actor, ?string $ipAddress): Lead
    {
        return DB::transaction(function () use ($data, $actor, $ipAddress): Lead {
            /** @var Lead $lead */
            $lead = parent::create($data);

            $this->syncCustomerForClosedSuccess($lead);
            $this->logActivity(
                $lead,
                'created',
                'Lead created through bulk upload.',
                [],
                $this->serializeLeadValues($lead),
                $actor,
                $ipAddress,
            );

            return $lead->refresh()->load($this->relations);
        });
    }

    public function bulkSampleCsv(): string
    {
        return implode("\n", [
            'name,phone_no,requirement,assignee_user_id,source,email,address_line_1,address_line_2,city,state,pincode,country,expected_order_value,expected_closure,status,failure_reason,failure_reason_details,tags,follow_up_date',
            '"Sample Lead","9876543210","Commercial treadmill","REPLACE_WITH_USER_ID","walk_in","lead@example.com","Address 1","","Mohali","Punjab","160055","India","","","new","","","hot",""',
        ]);
    }

    private function normalizeBulkHeader(string $header): string
    {
        $normalized = strtolower(trim(ltrim($header, "\xEF\xBB\xBF")));
        $normalized = preg_replace('/[^a-z0-9]+/', '_', $normalized) ?? '';
        $normalized = trim($normalized, '_');

        return match ($normalized) {
            'phone_no', 'phone_number', 'mobile', 'mobile_no' => 'phone',
            'assignee_user_id', 'assignee_id', 'assigned_user_id', 'assignee' => 'assigned_to',
            'source' => 'lead_source',
            default => $normalized,
        };
    }

    private function prepareBulkLeadData(array $payload, ?User $actor): array
    {
        $rawPhone = trim((string) ($payload['phone'] ?? ''));
        $phone = $this->normalizeBulkPhone($rawPhone);

        $source = strtolower(trim((string) ($payload['lead_source'] ?? '')));
        $source = str_replace([' ', '-'], '_', $source);
        $source = match ($source) {
            'walkin' => 'walk_in',
            'indiamart' => 'india_mart',
            default => $source,
        };

        $status = strtolower(trim((string) ($payload['status'] ?? 'new'))) ?: 'new';
        $tags = array_values(array_filter(array_map(
            fn (string $tag): string => strtolower(trim($tag)),
            preg_split('/[|;,]+/', (string) ($payload['tags'] ?? ''), -1, PREG_SPLIT_NO_EMPTY) ?: [],
        )));

        return [
            'lead_source' => $source,
            'name' => trim((string) ($payload['name'] ?? '')),
            'phone' => $phone,
            '_raw_phone' => $rawPhone,
            'email' => $this->nullableBulkValue($payload['email'] ?? null),
            'address_line_1' => $this->nullableBulkValue($payload['address_line_1'] ?? null),
            'address_line_2' => $this->nullableBulkValue($payload['address_line_2'] ?? null),
            'city' => $this->nullableBulkValue($payload['city'] ?? null),
            'state' => $this->nullableBulkValue($payload['state'] ?? null),
            'pincode' => $this->nullableBulkValue($payload['pincode'] ?? null),
            'country' => $this->nullableBulkValue($payload['country'] ?? null),
            'requirement' => trim((string) ($payload['requirement'] ?? '')),
            'expected_order_value' => $this->nullableBulkValue($payload['expected_order_value'] ?? null),
            'expected_closure' => $this->nullableBulkValue($payload['expected_closure'] ?? null),
            'status' => $status,
            'failure_reason' => $this->nullableBulkValue($payload['failure_reason'] ?? null),
            'failure_reason_details' => $this->nullableBulkValue($payload['failure_reason_details'] ?? null),
            'tags' => $tags,
            'follow_up_date' => $this->nullableBulkValue($payload['follow_up_date'] ?? null)
                ?: now()->addDays(2)->toDateString(),
            'assigned_to' => trim((string) ($payload['assigned_to'] ?? '')),
            'created_by' => $actor?->id,
        ];
    }

    private function bulkLeadRules(): array
    {
        return [
            'lead_source' => ['required', Rule::in(['walk_in', 'reference', 'india_mart', 'website'])],
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'digits:10'],
            '_raw_phone' => [
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if ($this->isRoundedScientificPhone((string) $value)) {
                        $fail('The phone number is rounded scientific notation and has lost digits. Format the Excel phone column as Text and export the CSV again.');
                    }
                },
            ],
            'email' => ['nullable', 'email', 'max:255'],
            'address_line_1' => ['nullable', 'string', 'max:255'],
            'address_line_2' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'pincode' => ['nullable', 'string', 'max:20'],
            'country' => ['nullable', 'string', 'max:100'],
            'requirement' => ['required', 'string'],
            'expected_order_value' => ['nullable', Rule::in(['5L-10L', '10L-30L', '30L+']), 'required_if:status,in_progress'],
            'expected_closure' => ['nullable', Rule::in(['10 days', '20 days', '30 days', '90 days']), 'required_if:status,in_progress'],
            'status' => ['required', Rule::in(['new', 'enquiry', 'in_progress', 'on_hold', 'closed_success', 'closed_fail'])],
            'failure_reason' => [
                'nullable',
                Rule::in(['lost_to_competitor', 'no_enquiry_made', 'lost_interest', 'no_response', 'didnt_like_product', 'product_not_available', 'other']),
                'required_if:status,closed_fail',
            ],
            'failure_reason_details' => ['nullable', 'string', 'max:2000', 'required_if:failure_reason,other'],
            'tags' => ['array'],
            'tags.*' => [Rule::in(['hot', 'premium'])],
            'follow_up_date' => ['required', 'date', 'after_or_equal:today'],
            'assigned_to' => ['required', 'integer', 'exists:users,id'],
            'created_by' => ['nullable', 'integer'],
        ];
    }

    private function nullableBulkValue(mixed $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }

    private function normalizeBulkPhone(string $phone): string
    {
        $phone = trim($phone);

        if (preg_match('/^[+]?\d+(?:\.\d+)?[eE][+-]?\d+$/', $phone) === 1) {
            $numericPhone = (float) $phone;

            if (is_finite($numericPhone) && $numericPhone >= 0) {
                $phone = number_format($numericPhone, 0, '.', '');
            }
        }

        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if (strlen($digits) <= 10) {
            return $digits;
        }

        $number = substr($digits, -10);
        $possibleCountryCode = ltrim(substr($digits, 0, -10), '0');

        // Country codes are not stored separately on leads. Recognized codes such
        // as 91, as well as an unrecognized prefix, are therefore discarded while
        // retaining the final 10-digit national number.
        if ($possibleCountryCode !== '' && preg_match('/^\d{1,3}$/', $possibleCountryCode) === 1) {
            return $number;
        }

        return $number;
    }

    private function isRoundedScientificPhone(string $phone): bool
    {
        if (preg_match('/^[+]?(\d+)(?:\.(\d+))?[eE][+]?(\d+)$/', trim($phone), $matches) !== 1) {
            return false;
        }

        $integerDigits = (int) $matches[3] + 1;
        $significantDigits = strlen(ltrim($matches[1].($matches[2] ?? ''), '0'));

        return $significantDigits < $integerDigits;
    }

    private function bulkFailureResult(int $row, string $name, string $phone, string $message): array
    {
        return [
            'row' => $row,
            'name' => $name,
            'phone' => $phone,
            'status' => 'failed',
            'message' => $message,
            'lead_id' => null,
        ];
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
                ] : ($log->new_values['actor'] ?? null),
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

    public function startCall(Lead $lead, ?User $actor = null, ?string $ipAddress = null): array
    {
        $activity = $this->logActivity(
            $lead,
            'called',
            'Called the lead.',
            [],
            [
                'connected' => null,
                'notes' => null,
                'actor' => $actor ? ['id' => $actor->id, 'name' => $actor->name, 'email' => $actor->email] : null,
            ],
            $actor,
            $ipAddress,
        );

        return $this->serializeActivity($activity);
    }

    public function resolveCall(
        Lead $lead,
        int|string $activityId,
        bool $connected,
        ?string $notes,
        ?string $followUpDate = null,
        ?User $actor = null
    ): array
    {
        $activity = ActivityLog::query()
            ->whereKey($activityId)
            ->where('module', 'leads')
            ->where('entity_type', 'lead')
            ->where('entity_id', $lead->id)
            ->where('action', 'called')
            ->firstOrFail();

        $dateChanged = filled($followUpDate)
            && optional($lead->follow_up_date)->format('Y-m-d') !== $followUpDate;

        $values = [
            'description' => ($connected
                ? 'Called the lead — connected. Discussion: '.trim((string) $notes)
                : 'Called the lead — not connected.')
                .($dateChanged ? ' Next follow up: '.$followUpDate.'.' : ''),
            'new_values' => [
                'connected' => $connected,
                'notes' => $connected ? trim((string) $notes) : null,
                'follow_up_date' => $dateChanged ? $followUpDate : null,
                'actor' => $activity->new_values['actor'] ?? ($actor ? ['id' => $actor->id, 'name' => $actor->name, 'email' => $actor->email] : null),
            ],
            'created_by' => $activity->created_by ?: $actor?->id,
        ];

        $activityLogColumns = $this->getActivityLogColumns();
        $activity->forceFill(Arr::only($values, $activityLogColumns));
        $activity->timestamps = $this->usesTimestamps($activityLogColumns);
        $activity->save();
        $activity->refresh();

        if ($dateChanged) {
            $lead->update(['follow_up_date' => $followUpDate]);
        }

        return [
            ...$this->serializeActivity($activity),
            'follow_up_date' => optional($lead->fresh()->follow_up_date)->format('Y-m-d'),
        ];
    }

    private function serializeActivity(ActivityLog $activity): array
    {
        $activity->loadMissing('user:id,name,email');

        return [
            'id' => $activity->id,
            'action' => $activity->action,
            'description' => $activity->description,
            'old_values' => $activity->old_values ?? [],
            'new_values' => $activity->new_values ?? [],
            'actor' => $activity->user
                ? ['id' => $activity->user->id, 'name' => $activity->user->name, 'email' => $activity->user->email]
                : ($activity->new_values['actor'] ?? null),
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

        if ($field === 'failure_reason') {
            return match ((string) $value) {
                'lost_to_competitor' => 'Lost to Competitor',
                'no_enquiry_made' => 'No Enquiry Made',
                'lost_interest' => 'Lost Interest',
                'no_response' => 'No Response',
                'didnt_like_product' => "Didn't Like the Product",
                'product_not_available' => 'Product Not Available',
                'other' => 'Other',
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
