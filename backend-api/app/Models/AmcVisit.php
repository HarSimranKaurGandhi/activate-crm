<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AmcVisit extends Model
{
    protected $fillable=['visit_number','scheduled_date','status','completed_at','notes'];
    protected function casts(): array { return ['scheduled_date'=>'date','completed_at'=>'datetime']; }
    public function amc(): BelongsTo { return $this->belongsTo(Amc::class); }
}
