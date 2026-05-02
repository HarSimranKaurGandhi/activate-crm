<?php

namespace App\Services;

use App\Models\Role;
use Illuminate\Database\Eloquent\Collection;

class RoleService
{
    public function dropdown(): Collection
    {
        return Role::query()
            ->where('is_active', true)
            ->orderBy('display_name')
            ->orderBy('name')
            ->get();
    }
}
