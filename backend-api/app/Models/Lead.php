<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
        'closure_hot_level',
        'status',
        'failure_reason',
        'failure_reason_details',
        'tags',
        'customer_importance',
        'customer_category',
        'follow_up_date',
        'assigned_to',
        'influencer_id',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'follow_up_date' => 'date',
            'closure_hot_level' => 'integer',
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

    public function influencer(): BelongsTo
    {
        return $this->belongsTo(Influencer::class);
    }

    public function favouritedBy(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'lead_favourites')->withTimestamps();
    }

    public function whatsappFollowUps(): HasMany
    {
        return $this->hasMany(LeadWhatsappFollowUp::class);
    }
}
