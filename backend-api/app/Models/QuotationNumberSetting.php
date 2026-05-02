<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QuotationNumberSetting extends Model
{
    protected $table = 'quotation_number_settings';

    protected $fillable = ['quotation_prefix', 'next_number', 'padding', 'default_validity_days'];

    protected function casts(): array
    {
        return ['next_number' => 'integer', 'padding' => 'integer', 'default_validity_days' => 'integer'];
    }
}
