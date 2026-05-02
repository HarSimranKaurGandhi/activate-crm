<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdjustmentMaster extends Model
{
    protected $table = 'adjustment_masters';

    protected $fillable = [
        'name', 'code', 'adjustment_type', 'value_type', 'default_value', 'is_taxable',
        'is_optional', 'is_editable', 'applies_to', 'display_order', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'default_value' => 'decimal:2',
            'is_taxable' => 'boolean',
            'is_optional' => 'boolean',
            'is_editable' => 'boolean',
            'is_active' => 'boolean',
            'display_order' => 'integer',
        ];
    }
}
