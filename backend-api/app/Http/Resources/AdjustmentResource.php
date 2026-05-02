<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdjustmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'adjustment_type' => $this->adjustment_type,
            'value_type' => $this->value_type,
            'default_value' => $this->default_value,
            'is_taxable' => (bool) $this->is_taxable,
            'is_optional' => (bool) $this->is_optional,
            'is_editable' => (bool) $this->is_editable,
            'applies_to' => $this->applies_to,
            'display_order' => $this->display_order,
            'is_active' => (bool) $this->is_active,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
