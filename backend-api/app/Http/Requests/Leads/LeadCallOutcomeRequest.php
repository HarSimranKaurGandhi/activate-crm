<?php

namespace App\Http\Requests\Leads;

use Illuminate\Foundation\Http\FormRequest;

class LeadCallOutcomeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'connected' => ['required', 'boolean'],
            'notes' => ['nullable', 'string', 'max:5000', 'required_if:connected,true'],
        ];
    }
}
