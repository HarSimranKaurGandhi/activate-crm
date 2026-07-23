<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryMovement extends Model
{
    protected $fillable = ['movement_date', 'movement_type', 'transport_type', 'slip_path', 'created_by'];
    protected function casts(): array { return ['movement_date' => 'date']; }
    public function items(): HasMany { return $this->hasMany(InventoryMovementItem::class); }
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
}
