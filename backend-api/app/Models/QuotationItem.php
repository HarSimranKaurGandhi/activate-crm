<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QuotationItem extends Model
{
    protected $table = 'quotation_items';

    protected $fillable = [
        'quotation_id', 'product_id', 'sort_order', 'product_name', 'model_number', 'specifications',
        'product_image_path', 'unit', 'quantity', 'mrp', 'base_price', 'edited_price',
        'gst_percent', 'discount_percent', 'discount_amount', 'price_after_discount',
        'taxable_amount', 'tax_amount', 'line_total',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2',
            'sort_order' => 'integer',
            'mrp' => 'decimal:2',
            'base_price' => 'decimal:2',
            'edited_price' => 'decimal:2',
            'gst_percent' => 'decimal:2',
            'discount_percent' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'price_after_discount' => 'decimal:2',
            'taxable_amount' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'line_total' => 'decimal:2',
        ];
    }

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function discountOverrides(): HasMany
    {
        return $this->hasMany(QuotationItemDiscountOverride::class);
    }
}
