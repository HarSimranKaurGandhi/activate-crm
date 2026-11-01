<?php

namespace App\Http\Requests\Masters;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        // Multipart forms encode the array as JSON so [] can explicitly clear tags.
        if (is_string($this->input('tag_ids'))) {
            $decoded = json_decode($this->input('tag_ids'), true);
            if (is_array($decoded) && array_is_list($decoded)) {
                $this->merge(['tag_ids' => $decoded]);
            }
        }
    }

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $productId = $this->route('id');

        return [
            'tag_ids' => ['sometimes', 'array', 'max:100'],
            'tag_ids.*' => ['required', 'integer', 'distinct', 'exists:tags,id'],
            'product_name' => ['required', 'string', 'max:255'],
            'model_number' => [
                'required',
                'string',
                'max:255',
                Rule::unique('products', 'model_number')->ignore($productId),
            ],
            'category_id' => ['required', 'exists:categories,id'],
            'brand_id' => [
                'required',
                Rule::exists('brands', 'id')->where(fn ($query) => $query->where('is_active', true)),
            ],
            'unit' => ['required', 'string', 'max:50', Rule::exists('measurement_units', 'code')->where(fn ($query) => $query->where('is_active', true))],
            'mrp' => ['required', 'numeric', 'min:0'],
            'usual_selling_price' => ['nullable', 'numeric', 'min:0'],
            'least_selling_price' => [
                'nullable',
                'numeric',
                'min:0',
                Rule::when($this->filled('usual_selling_price'), ['lte:usual_selling_price']),
            ],
            'specifications' => ['nullable', 'string'],
            'product_images' => ['sometimes', 'array'],
            'product_images.*' => ['file', 'image', 'max:5120'],
            'primary_image_token' => ['nullable', 'string', 'max:100'],
            'keep_existing_image_ids' => ['sometimes', 'array'],
            'keep_existing_image_ids.*' => ['integer'],
            'brochure_path' => ['nullable', 'string', 'max:500'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
