<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuotationAdjustmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'adjustment_master_id' => $this->adjustment_master_id,
            'name' => $this->name,
            'code' => $this->code,
            'adjustment_type' => $this->adjustment_type,
            'value_type' => $this->value_type,
            'value' => $this->value,
            'amount' => $this->amount,
            'is_taxable' => (bool) $this->is_taxable,
            'display_order' => $this->display_order,
        ];
    }
}
