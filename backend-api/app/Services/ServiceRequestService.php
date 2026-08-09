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
    private array $relations = ['customer:id,primary_name,company_name,phone', 'scheduledUser:id,name', 'creator:id,name,email', 'items', 'charges'];

    public function paginate(Request $request): LengthAwarePaginator
    {
        return ServiceRequest::query()
            ->with($this->relations)
            ->when($request->string('scope')->toString() === 'mine', fn (Builder $query) => $query->where('scheduled_user_id', $request->user()->id))
            ->when($request->filled('status'), fn (Builder $query) => $query->where('status', $request->string('status')->toString()))
            ->when(! $request->filled('status') && ! $request->boolean('include_closed'), fn (Builder $query) => $query->whereNotIn('status', ['completed', 'cancelled']))
            ->when($request->filled('search'), function (Builder $query) use ($request): void {
                $search = '%'.$request->string('search')->toString().'%';
                $query->where(fn (Builder $match) => $match->where('service_number', 'like', $search)
                    ->orWhereHas('customer', fn (Builder $customer) => $customer->where('primary_name', 'like', $search)->orWhere('company_name', 'like', $search)));
            })
            ->orderByRaw('scheduled_date is null')
            ->orderBy('scheduled_date')
            ->latest('id')
            ->paginate(min(100, max(1, (int) $request->integer('per_page', 20))));
    }

    public function create(array $data, ?User $actor): ServiceRequest
    {
        return DB::transaction(function () use ($data, $actor): ServiceRequest {
            $ownedProducts = CustomerOwnedProduct::query()
                ->with(['product.brand:id,name'])
                ->where('customer_id', $data['customer_id'])
                ->whereIn('id', collect($data['items'])->pluck('customer_owned_product_id'))
                ->get()->keyBy('id');

            if ($ownedProducts->count() !== count($data['items'])) {
                throw ValidationException::withMessages(['items' => 'One or more selected machines do not belong to this customer.']);
            }

            $service = ServiceRequest::create([
                'service_number' => 'TMP-'.Str::uuid(),
                'customer_id' => $data['customer_id'],
                'request_date' => $data['request_date'],
                'scheduled_date' => $data['scheduled_date'] ?? null,
                'scheduled_user_id' => $data['scheduled_user_id'] ?? null,
                'additional_comments' => $data['additional_comments'] ?? null,
                'status' => 'scheduled',
                'created_by' => $actor?->id,
            ]);
            $service->update(['service_number' => 'SRV-'.now()->format('Ym').'-'.str_pad((string) $service->id, 5, '0', STR_PAD_LEFT)]);

            foreach ($data['items'] as $item) {
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
            $before = $this->snapshot($service->load($this->relations));
            $ownedProducts = $this->ownedProducts($data);

            $service->update([
                'customer_id' => $data['customer_id'], 'request_date' => $data['request_date'],
                'scheduled_date' => $data['scheduled_date'] ?? null, 'scheduled_user_id' => $data['scheduled_user_id'] ?? null,
                'additional_comments' => $data['additional_comments'] ?? null, 'status' => $data['status'] ?? $service->status,
            ]);
            $service->items()->delete();
            foreach ($data['items'] as $item) {
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
            [$oldValues, $newValues, $labels] = $this->diff($before, $after);
            if ($labels !== []) $this->logActivity($service, 'updated', 'Updated '.implode(', ', $labels).'.', $oldValues, $newValues, $actor, $ipAddress);
            return $updated;
        });
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
            ->whereIn('id', collect($data['items'])->pluck('customer_owned_product_id'))->get()->keyBy('id');
        if ($owned->count() !== count($data['items'])) throw ValidationException::withMessages(['items' => 'One or more selected machines do not belong to this customer.']);
        return $owned;
    }

    private function snapshot(ServiceRequest $service): array
    {
        return [
            'request_date'=>optional($service->request_date)->format('Y-m-d'), 'scheduled_date'=>optional($service->scheduled_date)->format('Y-m-d') ?: '-',
            'scheduled_user'=>$service->scheduledUser?->name ?: 'Unassigned', 'status'=>$service->status,
            'additional_comments'=>$service->additional_comments ?: '-',
            'machines'=>$service->items->map(fn ($item)=>$item->machine_name.' ['.$item->coverage_type.'] ₹'.(float)$item->service_charges)->values()->all(),
            'custom_charges'=>$service->charges->map(fn ($charge)=>$charge->label.' ₹'.(float)$charge->amount)->values()->all(),
        ];
    }

    private function diff(array $before, array $after): array
    {
        $names=['request_date'=>'request date','scheduled_date'=>'scheduled date','scheduled_user'=>'scheduled user','status'=>'status','additional_comments'=>'comments','machines'=>'machines','custom_charges'=>'custom charges'];
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
