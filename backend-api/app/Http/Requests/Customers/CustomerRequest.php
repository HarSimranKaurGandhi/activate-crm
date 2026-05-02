<?php

namespace App\Http\Requests\Customers;

use Illuminate\Foundation\Http\FormRequest;

class CustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'primary_name' => ['required', 'string', 'max:255'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string'],
            'gst_number' => ['nullable', 'string', 'max:30'],
            'pan_number' => ['nullable', 'string', 'max:20'],
            'is_active' => ['sometimes', 'boolean'],
            'custom_fields' => ['sometimes', 'array'],
            'custom_fields.*.field_definition_id' => ['nullable', 'required_without:custom_fields.*.field_key', 'exists:customer_field_definitions,id'],
            'custom_fields.*.field_key' => ['nullable', 'required_without:custom_fields.*.field_definition_id', 'exists:customer_field_definitions,field_key'],
            'custom_fields.*.value' => ['nullable'],
        ];
    }
}
