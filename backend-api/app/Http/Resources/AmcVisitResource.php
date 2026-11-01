<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AmcVisitResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id'=>$this->id,'visit_number'=>$this->visit_number,'scheduled_date'=>optional($this->scheduled_date)?->format('Y-m-d'),'status'=>$this->status,'notes'=>$this->notes,
            'amc'=>$this->amc?['id'=>$this->amc->id,'amc_number'=>$this->amc->amc_number,'amc_type'=>$this->amc->amc_type,'status'=>$this->amc->status,'yearly_visits'=>$this->amc->yearly_visits,'visits_done'=>$this->amc->visits_done]:null,
            'customer'=>$this->amc?->customer?['id'=>$this->amc->customer->id,'name'=>$this->amc->customer->company_name ?: $this->amc->customer->primary_name,'phone'=>$this->amc->customer->phone]:null,
            'machines'=>$this->amc?->items?->pluck('machine_name')->values() ?? [],
        ];
    }
}
