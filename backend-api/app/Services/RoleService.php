<?php

namespace App\Services;

use App\Models\Role;
use Illuminate\Database\Eloquent\Collection;

class RoleService
{
    public function dropdown(): Collection
    {
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
