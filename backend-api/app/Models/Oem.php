<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Oem extends Model {
    protected $fillable = ['name', 'email', 'dealer_code', 'dealer_name', 'dealer_city', 'request_template'];
}
