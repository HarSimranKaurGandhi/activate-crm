<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoginLog extends Model
{
    protected $table = 'login_logs';

    protected $fillable = ['user_id', 'ip_address', 'user_agent', 'logged_in_at', 'logged_out_at'];

    protected function casts(): array
    {
        return ['logged_in_at' => 'datetime', 'logged_out_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
