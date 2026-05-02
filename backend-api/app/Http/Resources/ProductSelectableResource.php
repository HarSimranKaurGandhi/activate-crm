<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductSelectableResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_name' => $this->product_name,
            'model_number' => $this->model_number,
            'image_path' => $this->image_path,
            'mrp' => $this->mrp,
            'usual_selling_price' => $this->usual_selling_price,
            'gst_percent' => $this->gst_percent,
        ];
    }
}
