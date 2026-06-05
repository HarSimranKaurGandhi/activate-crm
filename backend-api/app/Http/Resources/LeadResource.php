<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LeadResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'lead_source' => $this->lead_source,
            'name' => $this->name,
            'phone' => $this->phone,
            'email' => $this->email,
            'address_line_1' => $this->address_line_1,
            'address_line_2' => $this->address_line_2,
            'city' => $this->city,
            'state' => $this->state,
            'pincode' => $this->pincode,
            'country' => $this->country,
            'requirement' => $this->requirement,
            'status' => $this->status,
            'tags' => $this->tags ?? [],
            'follow_up_date' => optional($this->follow_up_date)?->format('Y-m-d'),
            'assigned_to' => $this->assigned_to,
            'assigned_user' => $this->assignedUser ? [
                'id' => $this->assignedUser->id,
                'name' => $this->assignedUser->name,
                'email' => $this->assignedUser->email,
                'phone' => $this->assignedUser->phone,
                'designation' => $this->assignedUser->designation,
            ] : null,
            'created_by' => $this->created_by,
            'creator' => $this->creator ? [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
                'email' => $this->creator->email,
            ] : null,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
