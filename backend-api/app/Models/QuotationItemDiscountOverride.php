<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuotationItemDiscountOverride extends Model
{
    protected $table = 'quotation_item_discount_overrides';

    protected $fillable = ['quotation_item_id', 'discount_percent', 'discount_amount', 'reason', 'created_by'];

    protected function casts(): array
    {
        return ['discount_percent' => 'decimal:2', 'discount_amount' => 'decimal:2'];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(QuotationItem::class, 'quotation_item_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
