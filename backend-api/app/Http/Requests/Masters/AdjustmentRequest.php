<?php

namespace App\Http\Requests\Masters;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdjustmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:100'],
            'adjustment_type' => ['required', Rule::in(['discount', 'charge', 'tax', 'roundoff'])],
            'value_type' => ['required', Rule::in(['fixed', 'percent'])],
            'default_value' => ['required', 'numeric', 'min:0'],
            'is_taxable' => ['sometimes', 'boolean'],
            'is_optional' => ['sometimes', 'boolean'],
            'is_editable' => ['sometimes', 'boolean'],
            'applies_to' => ['nullable', 'string', 'max:100'],
            'display_order' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
