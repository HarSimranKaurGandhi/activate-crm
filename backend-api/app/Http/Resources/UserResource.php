<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'designation' => $this->designation,
            'is_active' => (bool) $this->is_active,
            'role_id' => $this->role_id,
            'role' => $this->whenLoaded('role', fn () => [
                'id' => $this->role?->id,
                'name' => $this->role?->name,
                'display_name' => $this->role?->display_name,
            ]),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
