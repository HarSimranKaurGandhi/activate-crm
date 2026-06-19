<?php

namespace App\Http\Requests\Masters;

use Illuminate\Foundation\Http\FormRequest;

class ProductIndexRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (! $this->has('is_active')) {
            return;
        }

        $value = $this->input('is_active');

        if (is_string($value)) {
            $normalized = strtolower(trim($value));

            if (in_array($normalized, ['true', '1', 'yes', 'on'], true)) {
                $this->merge(['is_active' => true]);
                return;
            }

            if (in_array($normalized, ['false', '0', 'no', 'off'], true)) {
                $this->merge(['is_active' => false]);
            }
        }
    }

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'search' => ['sometimes', 'nullable', 'string', 'max:255'],
            'category_id' => ['sometimes', 'nullable', 'integer', 'exists:categories,id'],
            'brand_id' => ['sometimes', 'nullable', 'integer', 'exists:brands,id'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
