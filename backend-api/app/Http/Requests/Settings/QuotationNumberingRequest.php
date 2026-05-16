<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class QuotationNumberingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'quotation_prefix' => ['required', 'string', 'max:50', 'regex:/^[A-Z0-9\/\-_]+$/'],
            'next_number' => ['required', 'integer', 'min:1'],
            'padding' => ['nullable', 'integer', 'min:1', 'max:10'],
            'default_validity_days' => ['nullable', 'integer', 'min:1', 'max:365'],
        ];
    }
}
