<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuotationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'quotation_number' => $this->quotation_number,
            'customer_id' => $this->customer_id,
            'customer' => new CustomerResource($this->whenLoaded('customer')),
            'salesperson_name' => $this->salesperson_name,
            'salesperson_phone' => $this->salesperson_phone,
            'salesperson_email' => $this->salesperson_email,
            'quote_date' => optional($this->quote_date)->toDateString(),
            'valid_until' => optional($this->valid_until)->toDateString(),
            'pricing_mode' => $this->pricing_mode,
            'show_discount_to_customer' => (bool) $this->show_discount_to_customer,
            'default_discount_percent' => $this->default_discount_percent,
            'default_discount_amount' => $this->default_discount_amount,
            'intro_text' => $this->intro_text,
            'remarks' => $this->remarks,
            'internal_notes' => $this->internal_notes,
            'status' => $this->status,
            'subtotal_before_discount' => $this->subtotal_before_discount,
            'total_line_discount' => $this->total_line_discount,
            'subtotal_after_discount' => $this->subtotal_after_discount,
            'total_adjustments' => $this->total_adjustments,
            'total_tax' => $this->total_tax,
            'subtotal' => $this->subtotal,
            'discount_total' => $this->discount_total,
            'taxable_total' => $this->taxable_total,
            'tax_total' => $this->tax_total,
            'adjustment_total' => $this->adjustment_total,
            'grand_total' => $this->grand_total,
            'requires_watermark' => $this->status !== 'approved',
            'items' => QuotationItemResource::collection($this->whenLoaded('items')),
            'adjustments' => QuotationAdjustmentResource::collection($this->whenLoaded('adjustments')),
            'terms' => QuotationTermResource::collection($this->whenLoaded('terms')),
            'approvals' => QuotationApprovalResource::collection($this->whenLoaded('approvals')),
            'created_by' => $this->created_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
