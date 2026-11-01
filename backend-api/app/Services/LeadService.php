<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Customer;
use App\Models\Influencer;
use App\Models\Lead;
use App\Models\Quotation;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
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

    private const API_RANDOM_ASSIGNMENT_ROLES = [
        'sales', 'sales_user', 'sales user', 'sales_manager', 'sales manager',
    ];

    private const API_INITIAL_ASSIGNMENT_ROLES = [
        ...self::API_RANDOM_ASSIGNMENT_ROLES, 'admin',
    ];

    protected string $modelClass = Lead::class;

    protected array $searchColumns = ['name', 'phone', 'email', 'city', 'state', 'country', 'requirement'];

    protected array $relations = ['creator', 'assignedUser', 'influencer'];

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
        'closure_hot_level' => 'Closure Hot Level',
        'status' => 'Status',
        'failure_reason' => 'Failure Reason',
        'failure_reason_details' => 'Failure Details',
        'tags' => 'Tags',
        'customer_importance' => 'Customer Importance',
        'customer_category' => 'Customer Category',
        'follow_up_date' => 'Follow Up Date',
        'assigned_to' => 'Assigned To',
        'influencer_id' => 'Influencer',
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

    public function rolloverUnfollowedLeads(?string $forDate = null): int
    {
        $day = $forDate
            ? Carbon::createFromFormat('!Y-m-d', $forDate, config('app.timezone'))
            : now(config('app.timezone'))->startOfDay();
        $today = $day->toDateString();
        $tomorrow = $day->copy()->addDay()->toDateString();
        $dayStart = $day->copy()->startOfDay();
        $dayEnd = $day->copy()->endOfDay();

        return DB::transaction(function () use ($today, $tomorrow, $dayStart, $dayEnd): int {
            $leads = Lead::query()
                ->whereBetween('follow_up_date', [$dayStart, $dayEnd])
                ->whereNotIn('status', self::CLOSED_STATUSES)
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            foreach ($leads as $lead) {
                $lead->update(['follow_up_date' => $tomorrow]);
                $this->logActivity(
                    $lead,
                    'follow_up_rolled_over',
                    'Unfollowed lead moved automatically to the next day.',
                    ['follow_up_date' => $today],
                    ['follow_up_date' => $tomorrow],
                    null,
                    null,
                );
            }

            return $leads->count();
        });
    }

    public function create(array $data, ?User $actor = null, ?string $ipAddress = null): Model
    {
        return DB::transaction(function () use ($data, $actor, $ipAddress): Model {
            $data = $this->withLockedClosureDate($data);
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

    public function generateCustomerRequirement(Customer $customer, array $data, User $actor, ?string $ipAddress = null): Model
    {
        return DB::transaction(function () use ($customer, $data, $actor, $ipAddress): Model {
            $customer = Customer::query()->lockForUpdate()->findOrFail($customer->id);
            $phone = $this->normalizePhone($customer->phone);
            $email = strtolower(trim((string) $customer->email));
            if ($phone === '' && $email === '') {
                throw ValidationException::withMessages(['customer' => ['Add a phone number or email to the customer first.']]);
            }

            // Prefer an active lead, then the most recent, matching phone before email.
            $candidates = Lead::query()->orderByRaw("CASE WHEN status IN ('closed_success', 'closed_fail') THEN 1 ELSE 0 END")
                ->orderByDesc('id')->lockForUpdate()->get();
            $lead = $phone !== '' ? $candidates->first(fn (Lead $row) => $this->normalizePhone($row->phone) === $phone) : null;
            $lead ??= $email !== '' ? $candidates->first(fn (Lead $row) => strtolower(trim((string) $row->email)) === $email) : null;
            $payload = [
                'requirement' => trim($data['requirement']),
                'assigned_to' => $data['assigned_to'],
                'status' => 'new',
                'failure_reason' => null,
                'failure_reason_details' => null,
                'follow_up_date' => now()->addDays(2)->toDateString(),
            ];
            if ($lead) {
                abort_unless($actor->hasAnyRole(['admin', 'sales_manager']) || (int) $lead->assigned_to === (int) $actor->id,
                    403, 'This customer has a lead assigned to another user. Ask an administrator or sales manager to reopen it.');
                return $this->update($lead, $payload, $actor, $ipAddress);
            }

            return $this->create([
                ...$customer->only(['phone', 'email', 'address_line_1', 'address_line_2', 'city', 'state', 'pincode', 'country', 'customer_importance', 'customer_category']),
                'name' => $customer->primary_name ?: $customer->company_name,
                'lead_source' => 'reference',
                'created_by' => $actor->id,
                ...$payload,
            ], $actor, $ipAddress);
        });
    }

    private function normalizePhone(?string $phone): string
    {
        return preg_replace('/\D+/', '', trim((string) $phone)) ?? '';
    }

    public function importApiBatch(array $rows,User $actor,?string $ipAddress=null): array
    {
        return DB::transaction(function()use($rows,$actor,$ipAddress):array{
            $existing=Lead::query()->with($this->relations)->lockForUpdate()->get();
            $activeUsers=User::query()->with('role:id,name,code')->where('is_active',true)->get();
            $salesUsers=$activeUsers->filter(fn(User $user)=>in_array($this->apiAssignmentRole($user),self::API_RANDOM_ASSIGNMENT_ROLES,true))->values();
            $initialAssignees=$activeUsers->filter(fn(User $user)=>in_array($this->apiAssignmentRole($user),self::API_INITIAL_ASSIGNMENT_ROLES,true))->values();
            $byPhone=$existing->filter(fn(Lead $lead)=>$this->normalizePhone($lead->phone)!=='')->keyBy(fn(Lead $lead)=>$this->normalizePhone($lead->phone));
            $byEmail=$existing->filter(fn(Lead $lead)=>filled($lead->email))->keyBy(fn(Lead $lead)=>strtolower(trim((string)$lead->email)));
            $results=[];$created=0;$updated=0;
            foreach($rows as $index=>$incoming){
                if(empty($incoming['assigned_to'])){
                    $initials=strtoupper(preg_replace('/[^A-Z0-9]/','',(string)($incoming['assigned_user']??''))??'');
                    $matching=$initials===''?collect():$initialAssignees->filter(fn(User $user)=>$this->userInitials($user->name)===$initials)->values();
                    $assignmentPool=$matching->isNotEmpty()?$matching:$salesUsers;
                    if($assignmentPool->isEmpty())throw ValidationException::withMessages(["leads.{$index}.assigned_user"=>['No active Sales User or Sales Manager is available for lead assignment.']]);
                    $incoming['assigned_to']=$assignmentPool->random()->id;
                }
                unset($incoming['assigned_user']);
                $phone=$this->normalizePhone($incoming['phone']??null);$email=strtolower(trim((string)($incoming['email']??'')));
                $phoneMatch=$phone!==''?$byPhone->get($phone):null;$emailMatch=$email!==''?$byEmail->get($email):null;
                if($phoneMatch&&$emailMatch&&$phoneMatch->id!==$emailMatch->id)throw ValidationException::withMessages(["leads.{$index}"=>['Phone and email match two different existing leads.']]);
                /** @var Lead|null $lead */
                $lead=$phoneMatch?:$emailMatch;
                if($lead){
                    $changes=[];
                    foreach(['name','phone','email','address_line_1','address_line_2','city','state','pincode','country','expected_order_value','expected_closure','customer_importance','customer_category','follow_up_date','assigned_to'] as $field){if(blank($lead->{$field})&&filled($incoming[$field]??null))$changes[$field]=$incoming[$field];}
                    $newRequirement=trim((string)$incoming['requirement']);$current=trim((string)$lead->requirement);
                    $requirements=array_map(fn($value)=>mb_strtolower(trim(preg_replace('/^\[\d{2}\s+[A-Za-z]{3}\s+\d{4}\]\s*/','',trim($value))??'')),preg_split('/\R+/',$current,-1,PREG_SPLIT_NO_EMPTY)?:[]);
                    if($newRequirement!==''&&!in_array(mb_strtolower($newRequirement),$requirements,true)){$datedRequirement='['.now()->format('d M Y').'] '.$newRequirement;$changes['requirement']=$current===''?$datedRequirement:$current."\n".$datedRequirement;}
                    $incomingTags=$incoming['tags']??[];if($incomingTags!==[])$changes['tags']=array_values(array_unique([...($lead->tags??[]),...$incomingTags]));
                    if($changes!==[])$lead=$this->update($lead,$changes,$actor,$ipAddress);
                    $updated++;$action='updated';
                }else{
                    $data=[...$incoming,'lead_source'=>$incoming['lead_source']??'website','status'=>$incoming['status']??'new','follow_up_date'=>$incoming['follow_up_date']??now()->toDateString(),'assigned_to'=>$incoming['assigned_to']??$actor->id,'created_by'=>$actor->id,'tags'=>$incoming['tags']??[]];
                    $lead=$this->create($data,$actor,$ipAddress);$created++;$action='created';
                    if($phone!=='')$byPhone->put($phone,$lead);if($email!=='')$byEmail->put($email,$lead);
                }
                $results[]=['index'=>$index,'lead_id'=>$lead->id,'action'=>$action,'name'=>$lead->name,'phone'=>$lead->phone,'email'=>$lead->email];
            }
            return ['created'=>$created,'updated'=>$updated,'total'=>count($rows),'results'=>$results];
        });
    }

    private function userInitials(string $name): string
    {
        return collect(preg_split('/\s+/',trim($name),-1,PREG_SPLIT_NO_EMPTY)?:[])->map(fn(string $part)=>mb_strtoupper(mb_substr($part,0,1)))->join('');
    }

    private function apiAssignmentRole(User $user): string
    {
        return strtolower(trim((string) ($user->role?->code ?: $user->role?->name)));
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
            'affliate' => 'affiliate',
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
            'lead_source' => ['required', Rule::in(['walk_in', 'reference', 'india_mart', 'website', 'johnson', 'hercules', 'affiliate'])],
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
            'expected_order_value' => ['nullable', Rule::in(['Less Than 1L', '1L-5L', '5L-10L', '10L-30L', '30L+']), 'required_if:status,in_progress'],
            'expected_closure' => ['nullable', Rule::in(['10 days', '20 days', '30 days', '90 days']), 'required_if:status,in_progress'],
            'status' => ['required', Rule::in(['new', 'enquiry', 'in_progress', 'on_hold', 'order_confirmed', 'closed_success', 'closed_fail'])],
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
            $data = $this->withLockedClosureDate($data, $lead);
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

    public function bulkUpdate(array $data, User $actor, ?string $ipAddress, Request $request): Collection
    {
        return DB::transaction(function () use ($data, $actor, $ipAddress, $request): Collection {
            $leadIds = collect($data['lead_ids'])->map(fn (mixed $id): int => (int) $id)->unique()->values();
            $updates = Arr::only($data, ['status', 'assigned_to', 'follow_up_date']);

            if (isset($updates['status']) && $updates['status'] !== 'closed_fail') {
                $updates['failure_reason'] = null;
                $updates['failure_reason_details'] = null;
            }

            $leads = $this->visibleQuery($request)
                ->whereKey($leadIds)
                ->lockForUpdate()
                ->get();

            if ($leads->count() !== $leadIds->count()) {
                throw ValidationException::withMessages([
                    'lead_ids' => ['One or more selected leads are unavailable or you do not have permission to update them.'],
                ]);
            }

            return $leads
                ->map(fn (Lead $lead): Model => $this->update($lead, $updates, $actor, $ipAddress))
                ->values();
        });
    }

    public function setFavourite(Lead $lead, User $user, bool $favourite): bool
    {
        if ($favourite) {
            $lead->favouritedBy()->syncWithoutDetaching([$user->id]);
        } else {
            $lead->favouritedBy()->detach($user->id);
        }

        return $favourite;
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
            ->map(function (ActivityLog $log): array {
                $newValues = $log->new_values ?? [];
                $embeddedActor = $newValues['_actor'] ?? $newValues['actor'] ?? null;
                $embeddedDescription = $newValues['_description'] ?? null;
                unset($newValues['_actor'], $newValues['_description']);

                return [
                    'id' => $log->id,
                    'action' => $log->action,
                    'description' => $log->description ?? $embeddedDescription,
                    'old_values' => $log->old_values ?? [],
                    'new_values' => $newValues,
                    'actor' => $log->user ? [
                        'id' => $log->user->id,
                        'name' => $log->user->name,
                        'email' => $log->user->email,
                    ] : $embeddedActor,
                    'occurred_at' => optional($log->created_at)->toISOString(),
                ];
            });

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

    public function quotationHistory(Lead $lead, Request $request): LengthAwarePaginator
    {
        $customerIds = collect();
        if (filled($lead->phone) || filled($lead->email)) {
            $customerIds = Customer::query()
                ->where(function (Builder $query) use ($lead): void {
                    if (filled($lead->phone)) {
                        $query->where('phone', $lead->phone);
                    }

                    if (filled($lead->email)) {
                        $method = filled($lead->phone) ? 'orWhere' : 'where';
                        $query->{$method}('email', $lead->email);
                    }
                })
                ->pluck('id');
        }

        $query = Quotation::query()
            ->where(function (Builder $quotations) use ($lead, $customerIds): void {
                $quotations->where('lead_id', $lead->id);

                if ($customerIds->isNotEmpty()) {
                    $quotations->orWhere(function (Builder $historical) use ($customerIds): void {
                        $historical->whereNull('lead_id')->whereIn('customer_id', $customerIds);
                    });
                }
            });

        $user = $request->user();
        if ($user instanceof User) {
            $user->loadMissing('role');
            if (! $user->hasAnyRole(['admin', 'operations', 'sales_manager'])) {
                $query->where('created_by', $user->id);
            }
        }

        return $query->latest('quote_date')->latest('id')->paginate((int) $request->integer('per_page', 15));
    }

    public function addComment(Lead $lead, string $comment, ?User $actor = null, ?string $ipAddress = null): array
    {
        $activity = $this->logActivity(
            $lead,
            'commented',
            trim($comment),
            [],
            [
                'comment' => trim($comment),
                'actor' => $actor ? [
                    'id' => $actor->id,
                    'name' => $actor->name,
                    'email' => $actor->email,
                ] : null,
            ],
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
            ] : ($activity->new_values['actor'] ?? null),
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

        $dateChanged = ! in_array($lead->status, self::CLOSED_STATUSES, true)
            && filled($followUpDate)
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
            'user_id' => $activity->user_id ?: $actor?->id,
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
        $viewer = $request->user();
        $favouriteUserId = $viewer instanceof User ? (int) $viewer->getKey() : null;

        if ($viewer instanceof User && $request->filled('favourite_user_id')) {
            $viewer->loadMissing('role');

            if ($viewer->hasAnyRole(['admin'])) {
                $favouriteUserId = $request->integer('favourite_user_id');
            }
        }

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
                fn (Builder $builder) => $this->applyInclusionFilter(
                    $builder,
                    'lead_source',
                    $leadSources,
                    $request->input('lead_source_operator'),
                )
            )
            ->when(
                $statuses !== [],
                fn (Builder $builder) => $this->applyInclusionFilter(
                    $builder,
                    'status',
                    $statuses,
                    $request->input('status_operator'),
                )
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
                fn (Builder $builder) => $this->applyInclusionFilter(
                    $builder,
                    'assigned_to',
                    $assigneeIds,
                    $request->input('assigned_to_operator'),
                    true,
                )
            )
            ->when(
                $request->filled('follow_up_from'),
                fn (Builder $builder) => $builder->whereDate('follow_up_date', '>=', $request->date('follow_up_from'))
            )
            ->when(
                $request->filled('follow_up_to'),
                fn (Builder $builder) => $builder->whereDate('follow_up_date', '<=', $request->date('follow_up_to'))
            )
            ->when(
                $request->boolean('favourites_only') && $favouriteUserId !== null,
                fn (Builder $builder) => $builder->whereHas(
                    'favouritedBy',
                    fn (Builder $favourites) => $favourites->where('users.id', $favouriteUserId),
                ),
            );
    }

    private function applyInclusionFilter(
        Builder $builder,
        string $column,
        array $values,
        mixed $operator,
        bool $includeNullsOnExclude = false,
    ): Builder {
        if ($operator !== 'is_not') {
            return $builder->whereIn($column, $values);
        }

        if (! $includeNullsOnExclude) {
            return $builder->whereNotIn($column, $values);
        }

        return $builder->where(function (Builder $inner) use ($column, $values): void {
            $inner->whereNotIn($column, $values)->orWhereNull($column);
        });
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

        $favouriteOwnerId = $user->hasAnyRole(['admin']) && $request->filled('favourite_user_id')
            ? $request->integer('favourite_user_id') : $user->id;
        $query->withExists([
            'favouritedBy as is_favourite' => fn (Builder $favourites) => $favourites->where('users.id', $favouriteOwnerId),
        ]);

        $user->loadMissing('role');

        if ($user->hasAnyRole(['influencer'])) {
            return $query->whereIn('influencer_id', \App\Models\Influencer::query()->where('user_id', $user->id)->where('is_active', true)->select('id'));
        }

        if ($user->hasAnyRole(['admin', 'sales_manager'])) {
            return $query;
        }

        return $query->where('assigned_to', $user->getKey());
    }

    private function syncCustomerForClosedSuccess(Lead $lead): void
    {
        if ($lead->status !== 'closed_success') {
            return;
        }

        $this->customerForLead($lead);
    }

    public function customerForLead(Lead $lead): Customer
    {
        $phoneCustomer = filled($lead->phone) ? Customer::query()->where('phone', $lead->phone)->first() : null;
        $emailCustomer = filled($lead->email)
            ? Customer::query()->where('email', strtolower(trim($lead->email)))->first()
            : null;
        $customer = $phoneCustomer ?: $emailCustomer;

        $payload = [
            'customer_type' => 'individual',
            'primary_name' => $lead->name ?: "Lead {$lead->phone}",
            'company_name' => null,
            'gst_number' => null,
            'email' => filled($lead->email) ? strtolower(trim($lead->email)) : null,
            'phone' => $lead->phone,
            'address_line_1' => $lead->address_line_1 ?: 'N/A',
            'address_line_2' => $lead->address_line_2,
            'city' => $lead->city,
            'state' => $lead->state ?: 'N/A',
            'pincode' => $lead->pincode,
            'country' => $lead->country ?: 'India',
            'customer_importance' => $lead->customer_importance,
            'customer_category' => $lead->customer_category,
            'notes' => $lead->requirement ?: null,
            'is_active' => true,
        ];

        if ($customer) {
            $emailCanBeUsed = ! $emailCustomer || $emailCustomer->is($customer);
            $phoneCanBeUsed = ! $phoneCustomer || $phoneCustomer->is($customer);
            $customer->update([
                'primary_name' => $customer->primary_name ?: $payload['primary_name'],
                'company_name' => $customer->company_name ?: $payload['company_name'],
                'email' => $customer->email ?: ($emailCanBeUsed ? $payload['email'] : null),
                'phone' => $customer->phone ?: ($phoneCanBeUsed ? $payload['phone'] : null),
                'address_line_1' => $customer->address_line_1 ?: $payload['address_line_1'],
                'address_line_2' => $customer->address_line_2 ?: $payload['address_line_2'],
                'city' => $customer->city ?: $payload['city'],
                'state' => $customer->state ?: $payload['state'],
                'pincode' => $customer->pincode ?: $payload['pincode'],
                'country' => $customer->country ?: $payload['country'],
                'customer_importance' => $customer->customer_importance ?: $payload['customer_importance'],
                'customer_category' => $customer->customer_category ?: $payload['customer_category'],
                'notes' => $customer->notes ?: $payload['notes'],
                'is_active' => true,
            ]);

            return $customer;
        }

        return Customer::create($payload);
    }

    private function withLockedClosureDate(array $data, ?Lead $existingLead = null): array
    {
        $status = (string) ($data['status'] ?? $existingLead?->status ?? '');

        if (! in_array($status, self::CLOSED_STATUSES, true)) {
            return $data;
        }

        $wasAlreadyClosed = $existingLead
            && in_array($existingLead->status, self::CLOSED_STATUSES, true);

        $data['follow_up_date'] = $wasAlreadyClosed
            ? (optional($existingLead->follow_up_date)->format('Y-m-d') ?: now()->toDateString())
            : now()->toDateString();

        return $data;
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
                'johnson' => 'Johnson',
                'hercules' => 'Hercules',
                'affiliate' => 'Affiliate',
                default => (string) ($value ?? '-'),
            };
        }

        if ($field === 'status') {
            return match ((string) $value) {
                'new' => 'New (Requirement Confirmed)',
                'enquiry' => 'Enquiry',
                'in_progress' => 'In Progress',
                'on_hold' => 'On Hold',
                'order_confirmed' => 'Order Confirmed',
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

        if ($field === 'influencer_id') {
            if (! $value) {
                return '-';
            }

            $influencer = Influencer::query()->find($value);

            return $influencer?->name ?: (string) $value;
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
        $activityLogColumns = $this->getActivityLogColumns();

        if ($actor) {
            $newValues['_actor'] = [
                'id' => $actor->id,
                'name' => $actor->name,
                'email' => $actor->email,
            ];
        }

        if (! in_array('description', $activityLogColumns, true)) {
            $newValues['_description'] = $description;
        }

        $activity = new ActivityLog(Arr::only([
            'module' => 'leads',
            'entity_type' => 'lead',
            'entity_id' => $lead->id,
            'action' => $action,
            'description' => $description,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'user_id' => $actor?->id,
            'created_by' => $actor?->id,
            'ip_address' => $ipAddress,
        ], $activityLogColumns));

        $activity->timestamps = $this->usesTimestamps($activityLogColumns);
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
