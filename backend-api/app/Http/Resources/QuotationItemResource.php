<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class QuotationItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'sort_order' => $this->sort_order,
            'product_name' => $this->product_name,
            'model_number' => $this->model_number,
            'specifications' => $this->specifications,
            'product_image_path' => $this->product_image_path
                ? $request->getSchemeAndHttpHost().Storage::url($this->product_image_path)
                : null,
            'unit' => $this->unit,
            'quantity' => $this->quantity,
            'mrp' => $this->mrp,
            'base_price' => $this->base_price,
            'edited_price' => $this->edited_price,
            'gst_percent' => $this->gst_percent,
            'discount_percent' => $this->discount_percent,
            'discount_amount' => $this->discount_amount,
            'price_after_discount' => $this->price_after_discount,
            'taxable_amount' => $this->taxable_amount,
            'tax_amount' => $this->tax_amount,
            'line_total' => $this->line_total,
            'discount_overrides' => QuotationItemDiscountOverrideResource::collection($this->whenLoaded('discountOverrides')),
        ];
    }
}
