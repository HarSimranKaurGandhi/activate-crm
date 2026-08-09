<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ServiceRequest extends Model
{
    protected $fillable = ['service_number', 'customer_id', 'request_date', 'scheduled_date', 'scheduled_user_id', 'additional_comments', 'status', 'created_by'];

    protected function casts(): array
    {
        return ['request_date' => 'date', 'scheduled_date' => 'date'];
    }

    public function customer(): BelongsTo { return $this->belongsTo(Customer::class); }
    public function scheduledUser(): BelongsTo { return $this->belongsTo(User::class, 'scheduled_user_id'); }
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
    public function items(): HasMany { return $this->hasMany(ServiceRequestItem::class); }
    public function charges(): HasMany { return $this->hasMany(ServiceRequestCharge::class); }
}
