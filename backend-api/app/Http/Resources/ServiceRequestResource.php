<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ServiceRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $customerName = $this->customer?->company_name
            ? $this->customer->company_name.($this->customer->primary_name ? ' ('.$this->customer->primary_name.')' : '')
            : $this->customer?->primary_name;

        $commentValues = array_key_exists('last_comment_values', $this->resource->getAttributes())
            ? json_decode($this->last_comment_values ?? 'null', true)
            : \App\Models\ActivityLog::where('module','services')->where('entity_type','service_request')->where('entity_id',$this->id)->where('action','commented')->orderByDesc('created_at')->orderByDesc('id')->first()?->new_values;

        return [
            'id' => $this->id,
            'service_number' => $this->service_number,
            'request_date' => optional($this->request_date)?->format('Y-m-d'),
            'scheduled_date' => optional($this->scheduled_date)?->format('Y-m-d'),
            'last_comment' => $commentValues['comment'] ?? null,
            'status' => $this->status,
            'payment_status' => $this->payment_status,
            'payment_submitted_at' => $this->payment_submitted_at?->toIso8601String(),
            'payment_submitted_by' => $this->payment_submitted_by,
            'additional_comments' => $this->additional_comments,
            'is_temporary_customer' => $this->customer_id === null,
            'customer' => $this->customer
                ? ['id' => $this->customer->id, 'name' => $customerName, 'phone' => $this->customer->phone, 'city' => $this->customer->city, 'email' => $this->customer->email, 'address' => implode(', ', array_filter([$this->customer->address_line_1, $this->customer->address_line_2, $this->customer->city, $this->customer->state, $this->customer->pincode, $this->customer->country])), 'is_temporary' => false]
                : ($this->temporary_customer_name ? ['id' => null, 'name' => $this->temporary_customer_name, 'phone' => $this->temporary_customer_phone, 'address' => $this->temporary_customer_address, 'is_temporary' => true] : null),
            'scheduled_user' => $this->scheduledUser ? ['id' => $this->scheduledUser->id, 'name' => $this->scheduledUser->name, 'phone' => $this->scheduledUser->phone] : null,
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
