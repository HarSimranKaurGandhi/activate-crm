<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ServiceRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'service_number' => $this->service_number,
            'request_date' => optional($this->request_date)?->format('Y-m-d'),
            'scheduled_date' => optional($this->scheduled_date)?->format('Y-m-d'),
            'status' => $this->status,
            'additional_comments' => $this->additional_comments,
            'customer' => $this->customer ? ['id' => $this->customer->id, 'name' => $this->customer->company_name ?: $this->customer->primary_name, 'phone' => $this->customer->phone] : null,
            'scheduled_user' => $this->scheduledUser ? ['id' => $this->scheduledUser->id, 'name' => $this->scheduledUser->name] : null,
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($item) => [
                'id' => $item->id, 'customer_owned_product_id' => $item->customer_owned_product_id,
                'machine_name' => $item->machine_name, 'model_number' => $item->model_number, 'brand' => $item->brand,
                'coverage_type' => $item->coverage_type, 'service_charges' => (float) $item->service_charges,
            ])),
            'custom_charges' => $this->whenLoaded('charges', fn () => $this->charges->map(fn ($charge) => ['id' => $charge->id, 'label' => $charge->label, 'amount' => (float) $charge->amount])),
            'total_charges' => (float) ($this->items->sum('service_charges') + $this->charges->sum('amount')),
            'created_at' => $this->created_at,
        ];
    }
}
