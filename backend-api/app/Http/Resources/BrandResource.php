<?php

namespace App\Http\Resources;

use Illuminate\Support\Facades\Storage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BrandResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $assetUrl = static fn (?string $path): ?string => $path
            ? $request->getSchemeAndHttpHost().Storage::url($path)
            : null;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'supplier_name' => $this->brand_owner,
            'description' => $this->description,
            'logo_path' => $assetUrl($this->logo),
            'catalog_path' => $assetUrl($this->catalog_path),
            'display_order' => $this->display_order,
            'is_active' => (bool) $this->is_active,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
