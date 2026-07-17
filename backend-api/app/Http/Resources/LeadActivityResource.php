<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LeadActivityResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource['id'],
            'action' => $this->resource['action'],
            'description' => $this->resource['description'] ?? null,
            'old_values' => $this->resource['old_values'] ?? [],
            'new_values' => $this->resource['new_values'] ?? [],
            'actor' => $this->resource['actor'] ?? null,
            'occurred_at' => $this->resource['occurred_at'] ?? null,
        ];
    }
}
