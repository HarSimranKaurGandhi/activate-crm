<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'primary_name' => $this->primary_name,
            'company_name' => $this->company_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'address' => $this->address,
            'gst_number' => $this->gst_number,
            'pan_number' => $this->pan_number,
            'is_active' => (bool) $this->is_active,
            'custom_fields' => CustomerFieldValueResource::collection($this->whenLoaded('fieldValues')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
