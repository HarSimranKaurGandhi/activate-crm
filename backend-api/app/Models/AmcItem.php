<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AmcItem extends Model
{
    protected $fillable=['customer_owned_product_id','machine_name','model_number','brand','amc_charges'];
    protected function casts(): array { return ['amc_charges'=>'decimal:2']; }
    public function amc(): BelongsTo { return $this->belongsTo(Amc::class); }
}
