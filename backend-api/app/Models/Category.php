<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    protected $table = 'categories';

    protected $fillable = ['name', 'description', 'hsn_code', 'gst_percent', 'display_order', 'is_active'];

    protected function casts(): array
    {
        return [
            'gst_percent' => 'decimal:2',
            'is_active' => 'boolean',
            'display_order' => 'integer',
        ];
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
