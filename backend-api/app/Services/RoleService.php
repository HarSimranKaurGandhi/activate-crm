<?php

namespace App\Services;

use App\Models\Role;
use Illuminate\Database\Eloquent\Collection;

class RoleService
{
    public function dropdown(): Collection
    {
        foreach ([
            [
                'code' => 'service_manager',
                'name' => 'Service Manager',
                'description' => 'Manages service requests and AMCs.',
            ],
            [
                'code' => 'service_executive',
                'name' => 'Service Executive',
                'description' => 'Handles assigned service requests and AMC visits.',
            ],
        ] as $role) {
            Role::firstOrCreate(['code' => $role['code']], $role);
        }
        Role::firstOrCreate(
            ['code' => 'sales_manager'],
            [
                'name' => 'Sales Manager',
                'description' => 'Can approve quotations with normal user access otherwise.',
            ]
        );

        return Role::query()
            ->orderBy('name')
            ->get();
    }
}
