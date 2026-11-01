<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserDropdownResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'designation' => $this->designation,
            'departments' => array_values((array) ($this->departments ?? [])),
            'is_active' => (bool) $this->is_active,
            'role' => $this->whenLoaded('role', fn () => $this->role ? [
                'id' => $this->role->id,
                'name' => $this->role->name,
                'code' => $this->role->code,
            ] : null),
        ];
    }
}
