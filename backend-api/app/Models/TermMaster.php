<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TermMaster extends Model
{
    protected $table = 'term_masters';

    protected $fillable = ['title', 'content', 'display_order', 'is_default', 'is_active'];

    protected function casts(): array
    {
        return [
            'display_order' => 'integer',
            'is_default' => 'boolean',
            'is_active' => 'boolean',
        ];
    }
}
