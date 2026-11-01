<?php

namespace App\Http\Requests\Customers;

use Illuminate\Foundation\Http\FormRequest;

class CustomerIndexRequest extends FormRequest
{
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
            'name' => ['sometimes','nullable','string','max:255'],
            'email' => ['sometimes','nullable','string','max:255'],
            'phone' => ['sometimes','nullable','string','max:30'],
            'city' => ['sometimes','nullable','string','max:100'],
            'rating' => ['sometimes','nullable','integer','min:1','max:5'],
            'sort_by' => ['sometimes','in:name,phone,location,rating'],
            'sort_direction' => ['sometimes','in:asc,desc'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
