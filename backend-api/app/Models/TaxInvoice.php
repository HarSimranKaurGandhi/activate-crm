<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaxInvoice extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['snapshot' => 'array', 'invoice_date' => 'date', 'due_date' => 'date',
            'taxable_total' => 'decimal:2', 'tax_total' => 'decimal:2', 'grand_total' => 'decimal:2'];
    }
}
