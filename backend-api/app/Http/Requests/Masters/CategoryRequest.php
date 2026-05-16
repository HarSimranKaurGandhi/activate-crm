<?php

namespace App\Http\Requests\Masters;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => is_string($this->name) ? trim($this->name) : $this->name,
        ]);
    }

    public function rules(): array
    {
        $categoryId = $this->route('id') ?? $this->route('category');

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('categories', 'name')
                    ->ignore($categoryId, 'id')
                    ->where(fn ($query) => $query->whereNull('deleted_at')),
            ],
            'description' => ['nullable', 'string'],
            'hsn_code' => ['nullable', 'string', 'max:50', 'regex:/^[A-Za-z0-9]+$/'],
            'gst_percent' => ['required', 'numeric', 'min:0', 'max:100'],
            'display_order' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
