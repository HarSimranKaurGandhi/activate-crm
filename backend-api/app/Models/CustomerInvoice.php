<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CustomerInvoice extends Model
{
    protected $fillable = ['customer_id', 'invoice_number', 'invoice_date', 'file_path', 'file_name', 'uploaded_by'];

    protected function casts(): array
    {
        return ['invoice_date' => 'date'];
    }

    public function products(): HasMany
    {
        return $this->hasMany(CustomerOwnedProduct::class);
    }
}
