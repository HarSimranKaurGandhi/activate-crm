<?php

namespace App\Http\Requests\Services;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AmcRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'customer_id'=>['required','integer','exists:customers,id'],
            'amc_type'=>['required',Rule::in(['amc','namc'])],
            'status'=>['required',Rule::in(['new','proposal','active','inactive'])],
            'yearly_visits'=>['required','integer','min:2','max:11'],
            'visits_done'=>['nullable','integer','min:0','lte:yearly_visits'],
            'start_date'=>['required','date'],
            'additional_comments'=>['nullable','string','max:5000'],
            'additional_charges'=>['nullable','numeric','min:0'],
            'items'=>['required','array','min:1'],
            'items.*.customer_owned_product_id'=>['required','integer','distinct','exists:customer_owned_products,id'],
            'items.*.amc_charges'=>['required','numeric','min:0'],
        ];
    }
}
