<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Leaderboard extends Model
{
    protected $fillable = [
        'user_id',
        'user_name',
        'user_designation',
        'period_type',
        'period_start',
        'period_end',
        'snapshot_date',
        'total_due_follow_ups',
        'follow_ups_done',
        'success_count',
        'failed_count',
        'pending_follow_ups',
        'score',
        'calculated_at',
    ];

    protected function casts(): array
    {
        return [
            'period_start' => 'date',
            'period_end' => 'date',
            'snapshot_date' => 'date',
            'score' => 'decimal:2',
            'calculated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
