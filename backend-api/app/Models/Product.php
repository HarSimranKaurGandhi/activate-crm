<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $table = 'products';

    protected $fillable = [
        'product_name', 'model_number', 'category_id', 'brand_id', 'unit',
        'mrp', 'usual_selling_price', 'least_selling_price', 'gst_percent', 'hsn_code', 'specifications',
        'image_path', 'brochure_path', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'mrp' => 'decimal:2',
            'usual_selling_price' => 'decimal:2',
            'least_selling_price' => 'decimal:2',
            'gst_percent' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function quotationItems(): HasMany
    {
        return $this->hasMany(QuotationItem::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderByDesc('is_primary')->orderBy('display_order')->orderBy('id');
    }
}
