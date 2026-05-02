<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompanyBankDetail extends Model
{
    protected $table = 'company_bank_details';

    protected $fillable = [
        'bank_name', 'account_name', 'account_number', 'ifsc_code', 'branch',
        'is_default', 'is_active',
    ];

    protected function casts(): array
    {
        return ['is_default' => 'boolean', 'is_active' => 'boolean'];
    }
}
