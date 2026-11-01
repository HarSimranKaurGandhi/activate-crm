<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class OwnedProductReference extends Model {
 protected $fillable=['customer_owned_product_id','serial_number','image_path','purchase_date','quantity'];
}
