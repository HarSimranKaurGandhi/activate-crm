<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class DispatchItem extends Model
{
    protected $fillable=['requirement','product_id','quantity','hsn_code','gst_percent','price','discount_percent','discounted_price'];
    public function product():BelongsTo{return $this->belongsTo(Product::class);}
}
