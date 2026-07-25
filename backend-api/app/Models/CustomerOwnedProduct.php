<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerOwnedProduct extends Model
{
    protected $fillable = [
        'customer_id', 'product_id', 'product_description', 'quantity', 'first_purchased_at',
        'last_purchased_at', 'source_dispatch_id', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',
            'first_purchased_at' => 'date',
            'last_purchased_at' => 'date',
        ];
    }

    public function customer(): BelongsTo { return $this->belongsTo(Customer::class); }
    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
    public function sourceDispatch(): BelongsTo { return $this->belongsTo(Dispatch::class, 'source_dispatch_id'); }
}
