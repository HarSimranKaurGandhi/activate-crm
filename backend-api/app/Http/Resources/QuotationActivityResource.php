<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuotationActivityResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource['id'],
            'source' => $this->resource['source'],
            'action' => $this->resource['action'],
            'status' => $this->resource['status'] ?? null,
            'remarks' => $this->resource['remarks'] ?? null,
            'description' => $this->resource['description'] ?? null,
            'actor' => $this->resource['actor'] ?? null,
            'occurred_at' => $this->resource['occurred_at'],
        ];
    }
}
