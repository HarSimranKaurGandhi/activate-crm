<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompanySetting extends Model
{
    protected $table = 'company_settings';

    protected $fillable = [
        'company_name', 'address_line_1', 'address_line_2', 'city', 'state', 'pincode', 'country',
        'phone', 'email', 'website', 'gst_number', 'pan_number',
        'logo_path', 'letterhead_path', 'signature_path', 'quotation_prefix', 'default_validity_days',
        'default_salesperson_name', 'default_salesperson_phone', 'default_salesperson_email',
    ];
}
