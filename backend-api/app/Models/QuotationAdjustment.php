<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuotationAdjustment extends Model
{
    protected $table = 'quotation_adjustments';

    protected $fillable = [
        'quotation_id', 'adjustment_master_id', 'name', 'code', 'adjustment_type',
        'value_type', 'value', 'amount', 'is_taxable', 'display_order',
    ];

    protected function casts(): array
    {
        return ['value' => 'decimal:2', 'amount' => 'decimal:2', 'is_taxable' => 'boolean', 'display_order' => 'integer'];
    }

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class);
    }

    public function master(): BelongsTo
    {
        return $this->belongsTo(AdjustmentMaster::class, 'adjustment_master_id');
    }
}
