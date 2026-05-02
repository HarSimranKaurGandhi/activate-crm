<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuotationReportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'quotation_number' => $this->quotation_number,
            'quote_date' => optional($this->quote_date)->toDateString(),
            'valid_until' => optional($this->valid_until)->toDateString(),
            'status' => $this->status,
            'pricing_mode' => $this->pricing_mode,
            'customer' => $this->whenLoaded('customer', fn () => [
                'id' => $this->customer?->id,
                'primary_name' => $this->customer?->primary_name,
                'company_name' => $this->customer?->company_name,
                'phone' => $this->customer?->phone,
                'email' => $this->customer?->email,
            ]),
            'salesperson' => [
                'name' => $this->salesperson_name,
                'phone' => $this->salesperson_phone,
                'email' => $this->salesperson_email,
            ],
            'created_by' => $this->created_by,
            'creator' => $this->whenLoaded('creator', fn () => [
                'id' => $this->creator?->id,
                'name' => $this->creator?->name,
                'email' => $this->creator?->email,
            ]),
            'subtotal_before_discount' => $this->subtotal_before_discount,
            'total_line_discount' => $this->total_line_discount,
            'subtotal_after_discount' => $this->subtotal_after_discount,
            'total_adjustments' => $this->total_adjustments,
            'total_tax' => $this->total_tax,
            'grand_total' => $this->grand_total,
            'approved_by' => $this->approved_by,
            'approved_at' => optional($this->approved_at)->toISOString(),
            'created_at' => optional($this->created_at)->toISOString(),
        ];
    }
}
