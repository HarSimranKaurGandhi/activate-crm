<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompanyBankDetail extends Model
{
    protected $table = 'company_bank_details';

    protected $fillable = [
        'company_setting_id', 'bank_name', 'account_name', 'account_number', 'ifsc_code', 'branch_name',
        'upi_id', 'is_default',
    ];

    protected function casts(): array
    {
        return ['is_default' => 'boolean'];
    }
}
