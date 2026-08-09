<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AmcResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $nextVisit=$this->relationLoaded('visits')?$this->visits->where('status','!=','completed')->sortBy('visit_number')->first():null;
        return [
            'id'=>$this->id,'amc_number'=>$this->amc_number,'amc_type'=>$this->amc_type,'status'=>$this->status,
            'yearly_visits'=>$this->yearly_visits,'visits_done'=>$this->visits_done,'start_date'=>optional($this->start_date)?->format('Y-m-d'),'end_date'=>optional($this->end_date)?->format('Y-m-d'),
            'additional_comments'=>$this->additional_comments,
            'additional_charges'=>(float)$this->additional_charges,
            'next_visit_date'=>optional($nextVisit?->scheduled_date)?->format('Y-m-d'),
            'can_complete_visit'=>$nextVisit ? $nextVisit->scheduled_date->startOfMonth()->lte(now()->startOfMonth()) : false,
            'customer'=>$this->customer?['id'=>$this->customer->id,'name'=>$this->customer->company_name ?: $this->customer->primary_name,'phone'=>$this->customer->phone]:null,
            'items'=>$this->whenLoaded('items',fn()=>$this->items->map(fn($item)=>['id'=>$item->id,'customer_owned_product_id'=>$item->customer_owned_product_id,'machine_name'=>$item->machine_name,'model_number'=>$item->model_number,'brand'=>$item->brand,'amc_charges'=>(float)$item->amc_charges])),
            'total_charges'=>(float)$this->items->sum('amc_charges')+(float)$this->additional_charges,'created_at'=>$this->created_at,
        ];
    }
}
