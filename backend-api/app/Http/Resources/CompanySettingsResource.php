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
        $addressParts = array_values(array_filter([
            $this->address_line_1,
            $this->address_line_2,
            $this->city,
            $this->state,
            $this->pincode,
            $this->country,
        ]));

        return [
            'id' => $this->id,
            'company_name' => $this->company_name,
            'address' => implode(', ', $addressParts),
            'address_line_1' => $this->address_line_1,
            'address_line_2' => $this->address_line_2,
            'city' => $this->city,
            'state' => $this->state,
            'pincode' => $this->pincode,
            'country' => $this->country,
            'phone' => $this->phone,
            'email' => $this->email,
            'website' => $this->website,
            'gst_number' => $this->gst_number,
            'pan_number' => $this->pan_number,
            'logo_path' => $assetUrl($this->logo_path),
            'letterhead_path' => $assetUrl($this->letterhead_path),
            'signature_path' => $assetUrl($this->signature_path),
            'quotation_prefix' => $this->quotation_prefix,
            'default_validity_days' => $this->default_validity_days,
            'default_salesperson_name' => $this->default_salesperson_name,
            'default_salesperson_phone' => $this->default_salesperson_phone,
            'default_salesperson_email' => $this->default_salesperson_email,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
