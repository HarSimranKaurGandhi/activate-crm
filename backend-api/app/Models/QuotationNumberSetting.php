<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QuotationNumberSetting extends Model
{
    protected $table = 'quotation_number_settings';

    protected $fillable = [
        'prefix', 'include_year', 'include_month', 'separator_key', 'current_sequence', 'reset_sequence',
        'quotation_prefix', 'next_number', 'padding', 'default_validity_days',
    ];

    protected function casts(): array
    {
        return [
            'include_year' => 'boolean',
            'include_month' => 'boolean',
            'current_sequence' => 'integer',
            'next_number' => 'integer',
            'padding' => 'integer',
            'default_validity_days' => 'integer',
        ];
    }
}
