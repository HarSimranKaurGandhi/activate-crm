<?php

namespace App\Services;

use App\Models\Amc;
use App\Models\AmcVisit;
use App\Models\CustomerOwnedProduct;
use App\Models\User;
use App\Models\ActivityLog;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;

class AmcService
{
    private array $relations=['customer:id,primary_name,company_name,phone','creator:id,name,email','items','visits'];

    public function list(string $view,int $perPage,bool $includeCompleted=false): LengthAwarePaginator
    {
        if($view==='this_month_visits'){
            return AmcVisit::query()->with(['amc.customer:id,primary_name,company_name,phone','amc.items'])
                ->whereHas('amc',fn($query)=>$query->where('status','active'))
                ->whereDate('scheduled_date','<',now()->startOfMonth()->addMonth())
                ->where(fn($query)=>$query->whereDate('scheduled_date','>=',now()->startOfMonth())->orWhere('status','pending'))
                ->when(!$includeCompleted,fn($query)=>$query->where('status','!=','completed'))
                ->orderBy('scheduled_date')->orderBy('visit_number')->paginate($perPage);
        }
        $query=Amc::query()->with($this->relations);
        if($view==='active')$query->where('status','active')->whereDate('end_date','>=',today());
        if($view==='prospect_expired')$query->where(fn($q)=>$q->where('status','new')->orWhere('status','inactive')->orWhereDate('end_date','<',today()));
        return $query->orderBy('end_date')->latest('id')->paginate($perPage);
    }

    public function create(array $data,?User $actor): Amc
    {
        return DB::transaction(function()use($data,$actor):Amc{
            $this->ensureVisitsDoneAreEligible($data);
            $owned=CustomerOwnedProduct::query()->with(['product.brand:id,name'])->where('customer_id',$data['customer_id'])
                ->whereIn('id',collect($data['items'])->pluck('customer_owned_product_id'))->get()->keyBy('id');
            if($owned->count()!==count($data['items']))throw ValidationException::withMessages(['items'=>'One or more selected machines do not belong to this customer.']);
            $start=Carbon::parse($data['start_date'])->startOfDay();
            $amc=Amc::create(['amc_number'=>'TMP-'.Str::uuid(),'customer_id'=>$data['customer_id'],'amc_type'=>$data['amc_type'],'status'=>$data['status'],
                'yearly_visits'=>$data['yearly_visits'],'visits_done'=>$data['visits_done']??0,'start_date'=>$start,'end_date'=>$start->copy()->addYear()->subDay(),'additional_comments'=>$data['additional_comments']??null,'additional_charges'=>$data['additional_charges']??0,'created_by'=>$actor?->id]);
            $amc->update(['amc_number'=>'AMC-'.now()->format('Ym').'-'.str_pad((string)$amc->id,5,'0',STR_PAD_LEFT)]);
            foreach($data['items'] as $item){$machine=$owned->get($item['customer_owned_product_id']);$amc->items()->create(['customer_owned_product_id'=>$machine->id,
                'machine_name'=>$machine->product?->product_name ?: $machine->product_description,'model_number'=>$machine->product?->model_number,'brand'=>$machine->product?->brand?->name,'amc_charges'=>$item['amc_charges']]);}
            $visits=(int)$data['yearly_visits'];
            for($index=0;$index<$visits;$index++)$amc->visits()->create(['visit_number'=>$index+1,'scheduled_date'=>$start->copy()->addMonths((int)floor($index*12/$visits)),'status'=>'pending']);
            $this->syncCompletedVisits($amc,(int)($data['visits_done']??0));
            $this->logActivity($amc,'created','AMC created.',[],[],$actor,request()->ip());
            return $amc->load($this->relations);
        });
    }

    public function find(int|string $id): Amc
    {
        return Amc::query()->with($this->relations)->findOrFail($id);
    }

    public function update(Amc $amc,array $data,?User $actor=null,?string $ip=null): Amc
    {
        return DB::transaction(function()use($amc,$data,$actor,$ip):Amc{
            $this->ensureVisitsDoneAreEligible($data);
            $before=$this->snapshot($amc);
            $owned=CustomerOwnedProduct::query()->with(['product.brand:id,name'])->where('customer_id',$data['customer_id'])
                ->whereIn('id',collect($data['items'])->pluck('customer_owned_product_id'))->get()->keyBy('id');
            if($owned->count()!==count($data['items']))throw ValidationException::withMessages(['items'=>'One or more selected machines do not belong to this customer.']);
            $start=Carbon::parse($data['start_date'])->startOfDay();
            $amc->update(['customer_id'=>$data['customer_id'],'amc_type'=>$data['amc_type'],'status'=>$data['status'],'yearly_visits'=>$data['yearly_visits'],'visits_done'=>$data['visits_done']??0,
                'start_date'=>$start,'end_date'=>$start->copy()->addYear()->subDay(),'additional_comments'=>$data['additional_comments']??null,'additional_charges'=>$data['additional_charges']??0]);
            $amc->items()->delete();
            foreach($data['items'] as $item){$machine=$owned->get($item['customer_owned_product_id']);$amc->items()->create(['customer_owned_product_id'=>$machine->id,
                'machine_name'=>$machine->product?->product_name ?: $machine->product_description,'model_number'=>$machine->product?->model_number,'brand'=>$machine->product?->brand?->name,'amc_charges'=>$item['amc_charges']]);}
            $visits=(int)$data['yearly_visits'];
            for($index=0;$index<$visits;$index++)$amc->visits()->updateOrCreate(['visit_number'=>$index+1],['scheduled_date'=>$start->copy()->addMonths((int)floor($index*12/$visits))]);
            $amc->visits()->where('visit_number','>',$visits)->delete();
            $this->syncCompletedVisits($amc,(int)($data['visits_done']??0));
            $updated=$amc->refresh()->load($this->relations);$after=$this->snapshot($updated);
            $old=[];$new=[];foreach($after as $key=>$value)if(($before[$key]??null)!=$value){$old[$key]=$before[$key]??'-';$new[$key]=$value;}
            if($new!==[])$this->logActivity($amc,'updated','AMC updated.',$old,$new,$actor,$ip);
            return $updated;
        });
    }

    public function completeNextVisit(Amc $amc,?User $actor=null,?string $ip=null): Amc
    {
        return DB::transaction(function () use ($amc,$actor,$ip): Amc {
            $locked=Amc::query()->lockForUpdate()->findOrFail($amc->id);
            if($locked->visits_done >= $locked->yearly_visits)throw ValidationException::withMessages(['visits_done'=>'All AMC visits are already completed.']);
            $next=$locked->visits()->where('status','!=','completed')->orderBy('visit_number')->lockForUpdate()->first();
            if(!$next)throw ValidationException::withMessages(['visits_done'=>'No pending AMC visit was found.']);
            if($next->scheduled_date->startOfMonth()->isAfter(now()->startOfMonth()))throw ValidationException::withMessages(['visits_done'=>'This visit cannot be completed until its scheduled month begins.']);
            $next->update(['status'=>'completed','completed_at'=>now()]);
            $locked->update(['visits_done'=>$locked->visits()->where('status','completed')->count()]);
            $this->logActivity($locked,'visit_completed','AMC visit '.$next->visit_number.' marked as done.',[],['visits_done'=>$locked->visits_done],$actor,$ip);
            return $locked->refresh()->load($this->relations);
        });
    }

    private function syncCompletedVisits(Amc $amc,int $visitsDone): void
    {
        $amc->visits()->where('visit_number','<=',$visitsDone)->where('status','!=','completed')->update(['status'=>'completed','completed_at'=>now()]);
        $amc->visits()->where('visit_number','>',$visitsDone)->where('status','completed')->update(['status'=>'pending','completed_at'=>null]);
    }

    private function ensureVisitsDoneAreEligible(array $data): void
    {
        $done=(int)($data['visits_done']??0);$total=(int)$data['yearly_visits'];$start=Carbon::parse($data['start_date'])->startOfDay();$eligible=0;
        for($index=0;$index<$total;$index++){if($start->copy()->addMonths((int)floor($index*12/$total))->startOfMonth()->lte(now()->startOfMonth()))$eligible++;}
        if($done>$eligible)throw ValidationException::withMessages(['visits_done'=>'Visits done cannot include visits from a future month.']);
    }

    public function activity(Amc $amc): Collection
    {
        $logs=ActivityLog::query()->with('user:id,name,email')->where('module','services')->where('entity_type','amc')->where('entity_id',$amc->id)->latest('created_at')->latest('id')->get()->map(function(ActivityLog $log){$values=$log->new_values??[];$embedded=$values['_actor']??null;unset($values['_actor']);return ['id'=>$log->id,'action'=>$log->action,'description'=>$log->description,'old_values'=>$log->old_values??[],'new_values'=>$values,'actor'=>$log->user?['id'=>$log->user->id,'name'=>$log->user->name,'email'=>$log->user->email]:$embedded,'occurred_at'=>optional($log->created_at)->toISOString()];});
        if(!$logs->contains(fn(array $entry)=>$entry['action']==='created'))$logs->push(['id'=>'created-'.$amc->id,'action'=>'created','description'=>'AMC created.','old_values'=>[],'new_values'=>[],'actor'=>$amc->creator?['id'=>$amc->creator->id,'name'=>$amc->creator->name,'email'=>$amc->creator->email]:null,'occurred_at'=>optional($amc->created_at)->toISOString()]);
        return $logs;
    }

    public function addComment(Amc $amc,string $comment,?User $actor,?string $ip): array
    {
        $this->logActivity($amc,'commented',trim($comment),[],['comment'=>trim($comment)],$actor,$ip);
        return $this->activity($amc)->first();
    }

    private function snapshot(Amc $amc): array
    {
        $amc->loadMissing('items');
        return ['type'=>$amc->amc_type,'status'=>$amc->status,'yearly_visits'=>$amc->yearly_visits,'visits_done'=>$amc->visits_done,'start_date'=>optional($amc->start_date)->format('Y-m-d'),'additional_charges'=>(float)$amc->additional_charges,'comments'=>$amc->additional_comments?:'-','machines'=>$amc->items->map(fn($item)=>$item->machine_name.' ₹'.(float)$item->amc_charges)->values()->all()];
    }
    private function logActivity(Amc $amc,string $action,string $description,array $old,array $new,?User $actor,?string $ip): void
    {
        if($actor)$new['_actor']=['id'=>$actor->id,'name'=>$actor->name,'email'=>$actor->email];
        $columns=Schema::getColumnListing('activity_logs');$activity=new ActivityLog();$activity->forceFill(Arr::only(['module'=>'services','entity_type'=>'amc','entity_id'=>$amc->id,'action'=>$action,'description'=>$description,'old_values'=>$old,'new_values'=>$new,'created_by'=>$actor?->id,'ip_address'=>$ip],$columns));$activity->timestamps=in_array('created_at',$columns,true)&&in_array('updated_at',$columns,true);$activity->save();
    }
}
