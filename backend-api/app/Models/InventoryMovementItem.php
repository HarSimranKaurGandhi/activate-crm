<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryMovementItem extends Model
{
    protected $fillable = ['product_id', 'godown_id', 'quantity', 'packages'];
    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
    public function godown(): BelongsTo { return $this->belongsTo(Godown::class); }
}
