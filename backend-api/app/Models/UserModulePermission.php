<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserModulePermission extends Model
{
    protected $fillable = ['module', 'can_view', 'can_edit'];

    protected function casts(): array
    {
        return [
            'can_view' => 'boolean',
            'can_edit' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
