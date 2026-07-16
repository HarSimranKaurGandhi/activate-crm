<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $brandLogoUrl = $this->brand?->logo
            ? $request->getSchemeAndHttpHost().Storage::url($this->brand->logo)
            : null;
        $productImageUrl = static fn (?string $path): ?string => $path
            ? $request->getSchemeAndHttpHost().Storage::url($path)
            : null;

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
                'logo_path' => $brandLogoUrl,
            ]),
            'unit' => $this->unit,
            'unit_name' => $this->measurementUnit?->name ?: $this->unit,
            'mrp' => $this->mrp,
            'usual_selling_price' => $this->usual_selling_price,
            'least_selling_price' => $this->least_selling_price,
            'gst_percent' => $this->gst_percent,
            'hsn_code' => $this->hsn_code,
            'specifications' => $this->specifications,
            'image_path' => $productImageUrl($this->image_path),
            'images' => ProductImageResource::collection($this->whenLoaded('images')),
            'brochure_path' => $this->brochure_path,
            'is_active' => (bool) $this->is_active,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
