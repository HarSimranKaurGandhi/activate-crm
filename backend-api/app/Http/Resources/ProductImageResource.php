<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ProductImageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'image_path' => $request->getSchemeAndHttpHost().Storage::url($this->image_path),
            'is_primary' => (bool) $this->is_primary,
            'display_order' => $this->display_order,
        ];
    }
}
