<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class CompanySettingsResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $assetUrl = static fn (?string $path): ?string => $path
            ? $request->getSchemeAndHttpHost().Storage::url($path)
            : null;

        return [
            'id' => $this->id,
            'company_name' => $this->company_name,
            'address' => $this->address,
            'phone' => $this->phone,
            'email' => $this->email,
            'gst_number' => $this->gst_number,
            'pan_number' => $this->pan_number,
            'logo_path' => $assetUrl($this->logo_path),
            'letterhead_path' => $assetUrl($this->letterhead_path),
            'signature_path' => $assetUrl($this->signature_path),
            'default_salesperson_name' => $this->default_salesperson_name,
            'default_salesperson_phone' => $this->default_salesperson_phone,
            'default_salesperson_email' => $this->default_salesperson_email,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
