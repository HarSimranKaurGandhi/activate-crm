<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CustomerFieldDefinition extends Model
{
    protected $table = 'customer_field_definitions';

    protected $fillable = [
        'field_key', 'field_label', 'field_type', 'options_json', 'is_required',
        'is_active', 'display_order',
    ];

    protected function casts(): array
    {
        return [
            'options_json' => 'array',
            'is_required' => 'boolean',
            'is_active' => 'boolean',
            'display_order' => 'integer',
        ];
    }

    public function values(): HasMany
    {
        return $this->hasMany(CustomerFieldValue::class, 'field_definition_id');
    }
}
