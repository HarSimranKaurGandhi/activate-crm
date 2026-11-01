<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InfluencerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'login_email' => $this->whenLoaded('loginUser', fn () => $this->loginUser?->email),
            'has_login' => $this->user_id !== null,
            'name' => $this->name,
            'influencer_type' => $this->influencer_type,
            'influencer_type_name' => $this->whenLoaded('typeDefinition', fn () => $this->typeDefinition?->name),
            'phone' => $this->phone,
            'email' => $this->email,
            'company_name' => $this->company_name,
            'city' => $this->city,
            'notes' => $this->notes,
            'assigned_to' => $this->assigned_to,
            'assigned_user' => $this->whenLoaded('assignedUser', fn () => $this->assignedUser ? [
                'id' => $this->assignedUser->id,
                'name' => $this->assignedUser->name,
                'email' => $this->assignedUser->email,
                'phone' => $this->assignedUser->phone,
                'designation' => $this->assignedUser->designation,
            ] : null),
            'leads_count' => (int) ($this->leads_count ?? 0),
            'is_active' => (bool) $this->is_active,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
