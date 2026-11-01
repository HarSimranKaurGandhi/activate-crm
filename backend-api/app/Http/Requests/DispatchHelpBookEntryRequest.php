<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DispatchHelpBookEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => is_string($this->input('name')) ? trim($this->input('name')) : $this->input('name'),
            'value' => is_string($this->input('value')) ? trim($this->input('value')) : $this->input('value'),
        ]);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'value' => ['required', 'string', 'max:5000'],
        ];
    }
}
