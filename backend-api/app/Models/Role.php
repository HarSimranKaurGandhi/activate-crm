<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Role extends Model
{
    protected $table = 'roles';

    protected $fillable = ['name', 'code', 'description'];

    protected $appends = ['display_name'];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'role_permissions');
    }

    public function getDisplayNameAttribute(): string
    {
        $value = $this->name ?: $this->code ?: 'Role';

        return Str::of($value)
            ->replace(['_', '-'], ' ')
            ->title()
            ->toString();
    }
}
