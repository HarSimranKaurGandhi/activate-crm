<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerFieldValue extends Model
{
    protected $table = 'customer_field_values';

    protected $fillable = ['customer_id', 'field_definition_id', 'field_value'];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function definition(): BelongsTo
    {
        return $this->belongsTo(CustomerFieldDefinition::class, 'field_definition_id');
    }
}
