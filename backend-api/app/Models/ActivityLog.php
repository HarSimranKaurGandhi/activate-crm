<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityLog extends Model
{
    protected $table = 'activity_logs';

    protected $fillable = [
        'module', 'entity_type', 'entity_id', 'action', 'description',
        'old_values', 'new_values', 'user_id', 'created_by', 'ip_address',
    ];

    protected function casts(): array
    {
        return ['old_values' => 'array', 'new_values' => 'array'];
    }

    /**
     * Activity timestamps are supplied by MySQL's UTC CURRENT_TIMESTAMP.
     * Interpret the timezone-less database value as UTC before exposing it.
     */
    protected function createdAt(): Attribute
    {
        return Attribute::get(
            fn (?string $value): ?Carbon => $value
                ? Carbon::parse($value, 'UTC')->setTimezone(config('app.timezone'))
                : null,
        );
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
