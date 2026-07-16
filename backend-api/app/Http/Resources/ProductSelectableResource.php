<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ProductSelectableResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_name' => $this->product_name,
            'model_number' => $this->model_number,
            'category_id' => $this->category_id,
            'brand_id' => $this->brand_id,
            'image_path' => $this->image_path ? $request->getSchemeAndHttpHost().Storage::url($this->image_path) : null,
            'brand' => $this->whenLoaded('brand', fn () => [
                'id' => $this->brand?->id,
                'name' => $this->brand?->name,
            ]),
            'mrp' => $this->mrp,
            'usual_selling_price' => $this->usual_selling_price,
            'least_selling_price' => $this->least_selling_price,
            'unit' => $this->unit,
            'gst_percent' => $this->gst_percent,
            'hsn_code' => $this->hsn_code,
            'specifications' => $this->specifications,
        ];
    }
}
