<?php

namespace App\Http\Requests\Masters;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'product_name' => ['required', 'string', 'max:255'],
            'model_number' => ['required', 'string', 'max:255'],
            'category_id' => ['required', 'exists:categories,id'],
            'brand_id' => ['required', 'exists:brands,id'],
            'unit' => ['required', 'string', 'max:50', Rule::exists('measurement_units', 'code')->where(fn ($query) => $query->where('is_active', true))],
            'mrp' => ['required', 'numeric', 'min:0'],
            'usual_selling_price' => ['required', 'numeric', 'min:0'],
            'least_selling_price' => ['required', 'numeric', 'min:0', 'lte:usual_selling_price'],
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
