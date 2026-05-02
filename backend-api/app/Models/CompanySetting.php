<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompanySetting extends Model
{
    protected $table = 'company_settings';

    protected $fillable = [
        'company_name', 'address', 'phone', 'email', 'gst_number', 'pan_number',
        'logo_path', 'letterhead_path', 'signature_path', 'default_salesperson_name',
        'default_salesperson_phone', 'default_salesperson_email',
    ];
}
