<?php

namespace App\Http\Requests\Masters;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BrandRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => is_string($this->name) ? trim($this->name) : $this->name,
            'supplier_name' => is_string($this->supplier_name) ? trim($this->supplier_name) : $this->supplier_name,
        ]);
    }

    public function rules(): array
    {
        $brandId = $this->route('id');

        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('brands', 'name')->ignore($brandId)],
            'supplier_name' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'brand_logo' => ['nullable', 'file', 'image', 'max:5120'],
            'brand_catalog' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:10240'],
            'display_order' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
