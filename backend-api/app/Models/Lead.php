<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Lead extends Model
{
    protected $fillable = [
        'lead_source',
        'name',
        'phone',
        'email',
        'address_line_1',
        'address_line_2',
        'city',
        'state',
        'pincode',
        'country',
        'requirement',
        'expected_order_value',
        'expected_closure',
        'status',
        'tags',
        'follow_up_date',
        'assigned_to',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'follow_up_date' => 'date',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }
}
