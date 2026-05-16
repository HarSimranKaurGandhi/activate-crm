<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuotationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $subtotalBeforeDiscount = (float) ($this->subtotal_before_discount ?? 0);
        $totalLineDiscount = (float) ($this->total_line_discount ?? 0);
        $subtotalAfterDiscount = (float) ($this->subtotal_after_discount ?? 0);
        $totalAdjustments = (float) ($this->total_adjustments ?? 0);
        $totalTax = (float) ($this->total_tax ?? 0);
        $taxableTotal = $this->pricing_mode === 'inclusive_gst'
            ? max((float) ($this->grand_total ?? 0) - $totalTax - $totalAdjustments, 0)
            : $subtotalAfterDiscount;

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
            'subtotal_before_discount' => $subtotalBeforeDiscount,
            'total_line_discount' => $totalLineDiscount,
            'subtotal_after_discount' => $subtotalAfterDiscount,
            'total_adjustments' => $totalAdjustments,
            'total_tax' => $totalTax,
            'subtotal' => $subtotalAfterDiscount,
            'discount_total' => $totalLineDiscount,
            'taxable_total' => $taxableTotal,
            'tax_total' => $totalTax,
            'adjustment_total' => $totalAdjustments,
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
