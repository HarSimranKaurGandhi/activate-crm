<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceRequestItem extends Model
{
    protected $fillable = ['customer_owned_product_id', 'machine_name', 'model_number', 'brand', 'coverage_type', 'service_charges'];
    protected function casts(): array { return ['service_charges' => 'decimal:2']; }
    public function serviceRequest(): BelongsTo { return $this->belongsTo(ServiceRequest::class); }
    public function ownedProduct(): BelongsTo { return $this->belongsTo(CustomerOwnedProduct::class, 'customer_owned_product_id'); }
}
