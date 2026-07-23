<?php
namespace App\Http\Requests;
use Illuminate\Foundation\Http\FormRequest;
class DispatchRequest extends FormRequest
{
    public function authorize():bool{return true;}
    public function rules():array{return [
        'customer_id'=>['required','integer','exists:customers,id'],
        'dispatch_date'=>['required','date','date_equals:today'],
        'planned_dispatch_date'=>['required','date','after:today'],
        'items'=>['required','array','min:1'],'items.*.requirement'=>['required','string','max:5000'],
        'items.*.product_id'=>['nullable','integer','exists:products,id'],'items.*.price'=>['required','numeric','min:0'],
        'items.*.quantity'=>['required','numeric','gt:0'],
        'items.*.discount_percent'=>['required','numeric','min:0','max:100'],'items.*.discounted_price'=>['required','numeric','min:0'],
    ];}
}
