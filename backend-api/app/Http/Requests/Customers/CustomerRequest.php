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
            'phone' => ['required', 'string', 'max:20'],
            'address_line_1' => ['required', 'string', 'max:255'],
            'address_line_2' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['required', 'string', 'max:100'],
            'pincode' => ['nullable', 'string', 'max:20'],
            'country' => ['required', 'string', 'max:100'],
            'rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'notes' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
            'custom_fields' => ['sometimes', 'array'],
            'custom_fields.*.field_definition_id' => ['nullable', 'required_without:custom_fields.*.field_key', 'exists:customer_field_definitions,id'],
            'custom_fields.*.field_key' => ['nullable', 'required_without:custom_fields.*.field_definition_id', 'exists:customer_field_definitions,field_key'],
            'custom_fields.*.value' => ['nullable'],
        ];
    }
}
