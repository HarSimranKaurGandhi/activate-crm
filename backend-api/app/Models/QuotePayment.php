<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class QuotePayment extends Model
{
    protected $fillable = ['quotation_id', 'quote_number', 'amount', 'payment_status', 'file_path', 'file_name', 'updated_by'];
    protected $hidden = ['file_path'];
    protected function casts(): array { return ['amount'=>'decimal:2']; }
}
