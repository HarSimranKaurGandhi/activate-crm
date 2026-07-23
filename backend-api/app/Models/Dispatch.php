<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
class Dispatch extends Model
{
    protected $fillable=['dispatch_number','customer_id','dispatch_date','planned_dispatch_date','status','invoice_path','created_by'];
    protected function casts():array{return ['dispatch_date'=>'date','planned_dispatch_date'=>'date'];}
    public function customer():BelongsTo{return $this->belongsTo(Customer::class);}
    public function creator():BelongsTo{return $this->belongsTo(User::class,'created_by');}
    public function items():HasMany{return $this->hasMany(DispatchItem::class);}
}
