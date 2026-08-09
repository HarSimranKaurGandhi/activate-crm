<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceRequestCharge extends Model
{
    protected $fillable = ['label', 'amount'];
    protected function casts(): array { return ['amount' => 'decimal:2']; }
    public function serviceRequest(): BelongsTo { return $this->belongsTo(ServiceRequest::class); }
}
