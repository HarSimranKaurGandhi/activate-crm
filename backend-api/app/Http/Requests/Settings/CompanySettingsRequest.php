<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class CompanySettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'company_name' => ['required', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'gst_number' => ['nullable', 'string', 'max:30', 'regex:/^[0-9A-Z]{15}$/'],
            'pan_number' => ['nullable', 'string', 'max:20', 'regex:/^[A-Z]{5}[0-9]{4}[A-Z]$/'],
            'logo_path' => ['nullable', 'string', 'max:500'],
            'letterhead_path' => ['nullable', 'string', 'max:500'],
            'signature_path' => ['nullable', 'string', 'max:500'],
            'default_salesperson_name' => ['nullable', 'string', 'max:255'],
            'default_salesperson_phone' => ['nullable', 'string', 'max:30'],
            'default_salesperson_email' => ['nullable', 'email', 'max:255'],
        ];
    }
}
