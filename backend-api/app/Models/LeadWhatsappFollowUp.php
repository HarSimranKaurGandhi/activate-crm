<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeadWhatsappFollowUp extends Model
{
    protected $fillable = ['lead_id', 'user_id', 'sent_on', 'message'];

    protected function casts(): array
    {
        return ['sent_on' => 'date'];
    }
}
