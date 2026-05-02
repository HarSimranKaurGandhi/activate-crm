<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoginLog extends Model
{
    protected $table = 'login_logs';

    protected $fillable = ['user_id', 'ip_address', 'user_agent', 'log_in_at', 'log_out_at'];

    protected function casts(): array
    {
        return ['log_in_at' => 'datetime', 'log_out_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
