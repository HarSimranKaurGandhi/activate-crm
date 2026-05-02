<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerFieldValueResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'field_definition_id' => $this->field_definition_id,
            'field_key' => $this->definition?->field_key,
            'field_label' => $this->definition?->field_label,
            'field_type' => $this->definition?->field_type,
            'value' => $this->normalizedValue(),
        ];
    }

    private function normalizedValue(): mixed
    {
        if (! is_string($this->value)) {
            return $this->value;
        }

        $decoded = json_decode($this->value, true);

        return json_last_error() === JSON_ERROR_NONE ? $decoded : $this->value;
    }
}
