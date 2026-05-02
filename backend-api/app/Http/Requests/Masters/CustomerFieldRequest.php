<?php

namespace App\Http\Requests\Masters;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CustomerFieldRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'field_key' => [
                'required',
                'string',
                'max:100',
                'regex:/^[a-z][a-z0-9_]*$/',
                Rule::unique('customer_field_definitions', 'field_key')->ignore($this->route('id')),
            ],
            'field_label' => ['required', 'string', 'max:255'],
            'field_type' => ['required', Rule::in(['text', 'textarea', 'number', 'email', 'phone', 'date', 'dropdown', 'checkbox'])],
            'options_json' => ['nullable', 'array', 'min:1', 'required_if:field_type,dropdown'],
            'options_json.*' => ['required_with:options_json', 'string', 'max:255'],
            'is_required' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'display_order' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
