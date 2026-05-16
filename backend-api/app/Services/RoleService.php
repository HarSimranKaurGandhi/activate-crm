<?php

namespace App\Services;

use App\Models\Role;
use Illuminate\Database\Eloquent\Collection;

class RoleService
{
    public function dropdown(): Collection
    {
        return Role::query()
            ->orderBy('name')
            ->get();
    }
}
