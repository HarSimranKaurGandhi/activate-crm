<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuotationNumberingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'quotation_prefix' => $this->quotation_prefix ?? 'QT-',
            'next_number' => $this->next_number ?? 1,
            'padding' => $this->padding ?? 5,
            'default_validity_days' => $this->default_validity_days ?? 30,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
