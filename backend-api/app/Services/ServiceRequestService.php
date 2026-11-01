<?php

namespace App\Services;

use App\Models\CustomerOwnedProduct;
use App\Models\ActivityLog;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Collection;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Schema;

class ServiceRequestService
{
    private ?array $activityLogColumns = null;
    private array $relations = ['customer:id,primary_name,company_name,phone,email,address_line_1,address_line_2,city,state,pincode,country', 'scheduledUser:id,name,phone', 'creator:id,name,email', 'items', 'charges'];

    public function paginate(Request $request): LengthAwarePaginator
    {
        $dateFilter = $request->string('date_filter')->toString() ?: 'all';
        $today = now(config('app.timezone'))->startOfDay();
        [$dateFrom, $dateTo] = match ($dateFilter) {
            'today' => [$today->toDateString(), $today->toDateString()],
            'this_week' => [$today->copy()->startOfWeek()->toDateString(), $today->copy()->endOfWeek()->toDateString()],
            'this_month' => [$today->copy()->startOfMonth()->toDateString(), $today->copy()->endOfMonth()->toDateString()],
            'range' => [$request->string('date_from')->toString(), $request->string('date_to')->toString()],
            'custom' => [$request->string('custom_date')->toString(), $request->string('custom_date')->toString()],
            default => [null, null],
        };

        return ServiceRequest::query()
            ->addSelect(['last_comment_values' => ActivityLog::select('new_values')->whereColumn('entity_id','service_requests.id')->where('module','services')->where('entity_type','service_request')->where('action','commented')->orderByDesc('created_at')->orderByDesc('id')->limit(1)])
            ->with($this->relations)
            ->when($request->string('scope')->toString() === 'mine', fn (Builder $query) => $query->where('scheduled_user_id', $request->user()->id))
            ->when($request->boolean('open_only'), fn (Builder $query) => $query->whereIn('status', ['scheduled', 'in_progress']))
            ->when($request->filled('status'), fn (Builder $query) => $query->where('status', $request->string('status')->toString()))
            ->when(! $request->filled('status') && ! $request->boolean('include_closed'), function (Builder $query): void {
                $query->where(fn (Builder $visible) => $visible
                    ->where('status', '!=', 'cancelled')
                    ->where(fn (Builder $notSettled) => $notSettled
                        ->where('status', '!=', 'completed')
                        ->orWhere('payment_status', 'pending')));
            })
            ->when($dateFrom && $dateTo, fn (Builder $query) => $query->whereBetween('scheduled_date', [$dateFrom, $dateTo]))
            ->when($request->filled('search'), function (Builder $query) use ($request): void {
                $search = '%'.$request->string('search')->toString().'%';
                $query->where(fn (Builder $match) => $match->where('service_number', 'like', $search)
                    ->orWhere('temporary_customer_name', 'like', $search)
                    ->orWhere('temporary_customer_phone', 'like', $search)
                    ->orWhere('temporary_customer_address', 'like', $search)
                    ->orWhereHas('customer', fn (Builder $customer) => $customer->where('primary_name', 'like', $search)->orWhere('company_name', 'like', $search)));
            })
            ->orderByRaw('scheduled_date is null')
            ->orderBy('scheduled_date')
            ->latest('id')
            ->paginate(min(100, max(1, (int) $request->integer('per_page', 20))));
    }

    public function payments(Request $request): array
    {
        $base = ServiceRequest::query()->when($request->filled('month'), function ($query) use ($request) {
            $month = \Carbon\CarbonImmutable::createFromFormat('!Y-m', $request->input('month'));
            $query->whereBetween('request_date', [$month->toDateString(), $month->endOfMonth()->toDateString()]);
        })
            ->when($request->input('scope') === 'mine', fn ($q) => $q->where('scheduled_user_id', $request->user()->id));
        $items = DB::table('service_request_items')->select('service_request_id')->selectRaw('SUM(service_charges) as amount')->groupBy('service_request_id');
        $charges = DB::table('service_request_charges')->select('service_request_id')->selectRaw('SUM(amount) as amount')->groupBy('service_request_id');
        $totals = (clone $base)->leftJoinSub($items, 'item_totals', 'item_totals.service_request_id', '=', 'service_requests.id')
            ->leftJoinSub($charges, 'charge_totals', 'charge_totals.service_request_id', '=', 'service_requests.id')
            ->selectRaw("COALESCE(SUM(CASE WHEN status = 'completed' THEN COALESCE(item_totals.amount, 0) + COALESCE(charge_totals.amount, 0) ELSE 0 END), 0) as revenue")
            ->selectRaw("COALESCE(SUM(CASE WHEN payment_status = 'received' THEN COALESCE(item_totals.amount, 0) + COALESCE(charge_totals.amount, 0) ELSE 0 END), 0) as collection")
            ->first();
        return [
            'revenue' => (float) $totals->revenue,
            'collection' => (float) $totals->collection,
            'entries' => $base->where('status', 'completed')->where('payment_status', 'received')
                ->when($request->input('submission') === 'pending', fn ($query) => $query->whereNull('payment_submitted_at'))
                ->with($this->relations)->orderByRaw('CASE WHEN payment_submitted_at IS NULL THEN 0 ELSE 1 END')
                ->orderByDesc('request_date')->orderByDesc('id')->paginate($request->integer('per_page', 20)),
        ];
    }

    public function submitPayment(int $id, User $actor, ?string $ip): ServiceRequest
    {
        return DB::transaction(function () use ($id, $actor, $ip): ServiceRequest {
            $service = ServiceRequest::query()->lockForUpdate()->findOrFail($id);
            if ($service->status !== 'completed' || $service->payment_status !== 'received') {
                throw ValidationException::withMessages(['payment' => ['Only Closed Success requests with collected payment can be submitted.']]);
            }
            if (!$service->payment_submitted_at) {
                $service->update(['payment_submitted_at' => now(), 'payment_submitted_by' => $actor->id]);
                $this->logActivity($service, 'payment_submitted', 'Payment submitted.', [], ['payment_submitted_at' => $service->payment_submitted_at->toIso8601String()], $actor, $ip);
            }
            return $service->load($this->relations);
        });
    }

    public function create(array $data, ?User $actor): ServiceRequest
    {
        return DB::transaction(function () use ($data, $actor): ServiceRequest {
            $temporary = (bool) $data['is_temporary_customer'];
            $ownedProducts = $temporary ? collect() : $this->ownedProducts($data);

            $service = ServiceRequest::create([
                'service_number' => 'TMP-'.Str::uuid(),
                'customer_id' => $temporary ? null : $data['customer_id'],
                'temporary_customer_name' => $temporary ? $data['temporary_customer_name'] : null,
                'temporary_customer_phone' => $temporary ? $data['temporary_customer_phone'] : null,
                'temporary_customer_address' => $temporary ? $data['temporary_customer_address'] : null,
                'request_date' => $data['request_date'],
                'scheduled_date' => $data['scheduled_date'] ?? null,
                'scheduled_user_id' => $data['scheduled_user_id'] ?? null,
                'additional_comments' => $data['additional_comments'] ?? null,
                'status' => 'scheduled',
                'payment_status' => $data['payment_status'] ?? 'pending',
                'created_by' => $actor?->id,
            ]);
            $service->update(['service_number' => 'SRV-'.now()->format('Ym').'-'.str_pad((string) $service->id, 5, '0', STR_PAD_LEFT)]);

            foreach ($data['items'] ?? [] as $item) {
                $owned = $ownedProducts->get($item['customer_owned_product_id']);
                $service->items()->create([
                    'customer_owned_product_id' => $owned->id,
                    'machine_name' => $owned->product?->product_name ?: $owned->product_description,
                    'model_number' => $owned->product?->model_number,
                    'brand' => $owned->product?->brand?->name,
                    'coverage_type' => $item['coverage_type'],
                    'service_charges' => $item['service_charges'],
                ]);
            }

            foreach ($data['custom_charges'] ?? [] as $charge) {
                $service->charges()->create($charge);
            }

            $this->logActivity($service, 'created', 'Service request created.', [], $this->snapshot($service->load($this->relations)), $actor, request()->ip());

            return $service->load($this->relations);
        });
    }

    public function find(int|string $id): ServiceRequest
    {
        return ServiceRequest::query()->with($this->relations)->findOrFail($id);
    }

    public function update(ServiceRequest $service, array $data, ?User $actor, ?string $ipAddress): ServiceRequest
    {
        return DB::transaction(function () use ($service, $data, $actor, $ipAddress): ServiceRequest {
            $service = ServiceRequest::query()->lockForUpdate()->findOrFail($service->id);
            $before = $this->snapshot($service->load($this->relations));
            $temporary = (bool) $data['is_temporary_customer'];
            $ownedProducts = $temporary ? collect() : $this->ownedProducts($data);

            $service->update([
                'customer_id' => $temporary ? null : $data['customer_id'],
                'temporary_customer_name' => $temporary ? $data['temporary_customer_name'] : null,
                'temporary_customer_phone' => $temporary ? $data['temporary_customer_phone'] : null,
                'temporary_customer_address' => $temporary ? $data['temporary_customer_address'] : null,
                'request_date' => $data['request_date'],
                'scheduled_date' => $data['scheduled_date'] ?? null, 'scheduled_user_id' => $data['scheduled_user_id'] ?? null,
                'additional_comments' => $data['additional_comments'] ?? null, 'status' => $data['status'] ?? $service->status,
                'payment_status' => $data['payment_status'] ?? $service->payment_status,
            ]);
            $service->items()->delete();
            foreach ($data['items'] ?? [] as $item) {
                $owned = $ownedProducts->get($item['customer_owned_product_id']);
                $service->items()->create([
                    'customer_owned_product_id' => $owned->id, 'machine_name' => $owned->product?->product_name ?: $owned->product_description,
                    'model_number' => $owned->product?->model_number, 'brand' => $owned->product?->brand?->name,
                    'coverage_type' => $item['coverage_type'], 'service_charges' => $item['service_charges'],
                ]);
            }
            $service->charges()->delete();
            foreach ($data['custom_charges'] ?? [] as $charge) $service->charges()->create($charge);

            $updated = $service->refresh()->load($this->relations);
            $after = $this->snapshot($updated);
            if ($updated->payment_submitted_at && ($updated->status !== 'completed' || $updated->payment_status !== 'received' || $before['machines'] !== $after['machines'] || $before['custom_charges'] !== $after['custom_charges'])) {
                $updated->update(['payment_submitted_at' => null, 'payment_submitted_by' => null]);
                $this->logActivity($updated, 'payment_submission_reset', 'Payment submission reset after service or charge changes.', [], [], $actor, $ipAddress);
            }
            [$oldValues, $newValues, $labels] = $this->diff($before, $after);
            if ($labels !== []) $this->logActivity($service, 'updated', 'Updated '.implode(', ', $labels).'.', $oldValues, $newValues, $actor, $ipAddress);
            return $updated;
        });
    }

    public function reschedule(int $id, array $data, User $actor, ?string $ip): ServiceRequest
    {
        return DB::transaction(function () use ($id, $data, $actor, $ip) {
            $service = ServiceRequest::query()->lockForUpdate()->findOrFail($id);
            $previous = $service->scheduled_date?->toDateString();
            if ($previous !== ($data['previous_date'] ?? null)) {
                throw ValidationException::withMessages(['scheduled_date' => 'This service was rescheduled by another user. Refresh the calendar and try again.']);
            }
            if ($data['scheduled_date'] < $service->request_date->toDateString()) {
                throw ValidationException::withMessages(['scheduled_date' => 'The scheduled date cannot be earlier than the request date.']);
            }
            if ($previous !== $data['scheduled_date']) {
                $service->update(['scheduled_date' => $data['scheduled_date']]);
                $this->logActivity($service, 'rescheduled', 'Service rescheduled from the calendar.',
                    ['scheduled_date' => $previous], ['scheduled_date' => $data['scheduled_date']], $actor, $ip);
            }
            return $service->load($this->relations);
        });
    }

    public function delete(ServiceRequest $service): void
    {
        $service->delete();
    }

    public function activity(ServiceRequest $service): Collection
    {
        $logs = ActivityLog::query()->with('user:id,name,email')->where('module', 'services')->where('entity_type', 'service_request')->where('entity_id', $service->id)
            ->latest('created_at')->latest('id')->get()->map(function (ActivityLog $log) {
                $values=$log->new_values??[];$embedded=$values['_actor']??null;unset($values['_actor']);
                return ['id'=>$log->id,'action'=>$log->action,'description'=>$log->description ?: ucfirst(str_replace('_',' ',$log->action)),'old_values'=>$log->old_values??[],'new_values'=>$values,'actor'=>$log->user?['id'=>$log->user->id,'name'=>$log->user->name,'email'=>$log->user->email]:$embedded,'occurred_at'=>optional($log->created_at)->toISOString()];
            });
        if (! $logs->contains(fn (array $entry) => $entry['action'] === 'created')) {
            $logs->push(['id'=>'created-'.$service->id,'action'=>'created','description'=>'Service request created.','old_values'=>[],'new_values'=>[],'actor'=>$service->creator?['id'=>$service->creator->id,'name'=>$service->creator->name,'email'=>$service->creator->email]:null,'occurred_at'=>optional($service->created_at)->toISOString()]);
        }
        return $logs;
    }

    public function addComment(ServiceRequest $service, string $comment, ?User $actor, ?string $ipAddress): array
    {
        $this->logActivity($service, 'commented', trim($comment), [], ['comment' => trim($comment)], $actor, $ipAddress);

        return $this->activity($service)->first();
    }

    private function ownedProducts(array $data): Collection
    {
        $owned = CustomerOwnedProduct::query()->with(['product.brand:id,name'])->where('customer_id', $data['customer_id'])
            ->whereIn('id', collect($data['items'] ?? [])->pluck('customer_owned_product_id'))->get()->keyBy('id');
        if ($owned->count() !== count($data['items'] ?? [])) throw ValidationException::withMessages(['items' => 'One or more selected machines do not belong to this customer.']);
        return $owned;
    }

    private function snapshot(ServiceRequest $service): array
    {
        $customerName = $service->customer?->company_name
            ? $service->customer->company_name.($service->customer->primary_name ? ' ('.$service->customer->primary_name.')' : '')
            : $service->customer?->primary_name;

        return [
            'request_date'=>optional($service->request_date)->format('Y-m-d'), 'scheduled_date'=>optional($service->scheduled_date)->format('Y-m-d') ?: '-',
            'customer'=>$customerName ?: $service->temporary_customer_name ?: '-',
            'scheduled_user'=>$service->scheduledUser?->name ?: 'Unassigned', 'status'=>$service->status,
            'payment_status'=>$service->payment_status,
            'additional_comments'=>$service->additional_comments ?: '-',
            'machines'=>$service->items->map(fn ($item)=>$item->machine_name.' ['.$item->coverage_type.'] ₹'.(float)$item->service_charges)->values()->all(),
            'custom_charges'=>$service->charges->map(fn ($charge)=>$charge->label.' ₹'.(float)$charge->amount)->values()->all(),
        ];
    }

    private function diff(array $before, array $after): array
    {
        $names=['request_date'=>'request date','scheduled_date'=>'scheduled date','customer'=>'customer','scheduled_user'=>'scheduled user','status'=>'status','payment_status'=>'payment status','additional_comments'=>'comments','machines'=>'machines','custom_charges'=>'custom charges'];
        $old=[];$new=[];$labels=[];
        foreach($names as $key=>$label){if(($before[$key]??null)==($after[$key]??null))continue;$old[$key]=$before[$key]??'-';$new[$key]=$after[$key]??'-';$labels[]=$label;}
        return [$old,$new,$labels];
    }

    private function logActivity(ServiceRequest $service,string $action,string $description,array $old,array $new,?User $actor,?string $ip): void
    {
        if($actor)$new['_actor']=['id'=>$actor->id,'name'=>$actor->name,'email'=>$actor->email];
        $columns = $this->activityLogColumns ??= Schema::getColumnListing('activity_logs');
        $activity = new ActivityLog();
        $activity->forceFill(Arr::only(['module'=>'services','entity_type'=>'service_request','entity_id'=>$service->id,'action'=>$action,'description'=>$description,'old_values'=>$old,'new_values'=>$new,'created_by'=>$actor?->id,'ip_address'=>$ip], $columns));
        $activity->timestamps = in_array('created_at', $columns, true) && in_array('updated_at', $columns, true);
        $activity->save();
    }
}
