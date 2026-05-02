<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_name' => $this->product_name,
            'model_number' => $this->model_number,
            'category_id' => $this->category_id,
            'brand_id' => $this->brand_id,
            'category' => $this->whenLoaded('category', fn () => [
                'id' => $this->category?->id,
                'name' => $this->category?->name,
            ]),
            'brand' => $this->whenLoaded('brand', fn () => [
                'id' => $this->brand?->id,
                'name' => $this->brand?->name,
                'logo_path' => $this->brand?->logo_path,
            ]),
            'unit' => $this->unit,
            'mrp' => $this->mrp,
            'usual_selling_price' => $this->usual_selling_price,
            'gst_percent' => $this->gst_percent,
            'specifications' => $this->specifications,
            'image_path' => $this->image_path,
            'brochure_path' => $this->brochure_path,
            'is_active' => (bool) $this->is_active,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
