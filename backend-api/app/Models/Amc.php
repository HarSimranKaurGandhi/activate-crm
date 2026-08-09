<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Amc extends Model
{
    protected $fillable = ['amc_number','customer_id','amc_type','status','yearly_visits','visits_done','start_date','end_date','additional_comments','additional_charges','created_by'];
    protected function casts(): array { return ['start_date'=>'date','end_date'=>'date','yearly_visits'=>'integer','visits_done'=>'integer','additional_charges'=>'decimal:2']; }
    public function customer(): BelongsTo { return $this->belongsTo(Customer::class); }
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
    public function items(): HasMany { return $this->hasMany(AmcItem::class); }
    public function visits(): HasMany { return $this->hasMany(AmcVisit::class); }
}
