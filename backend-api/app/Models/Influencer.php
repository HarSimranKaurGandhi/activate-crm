<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Influencer extends Model
{
    public function typeDefinition(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(InfluencerType::class, 'influencer_type', 'code');
    }
    protected $fillable = [
        'name',
        'influencer_type',
        'phone',
        'email',
        'company_name',
        'city',
        'notes',
        'assigned_to',
        'is_active',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function loginUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }
}
