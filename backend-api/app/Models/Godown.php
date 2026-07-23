<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Godown extends Model
{
    protected $fillable = ['name', 'address', 'is_active'];
    protected function casts(): array { return ['is_active' => 'boolean']; }
}
