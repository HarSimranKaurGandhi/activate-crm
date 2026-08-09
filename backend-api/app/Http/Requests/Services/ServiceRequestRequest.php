<?php

namespace App\Http\Requests\Services;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ServiceRequestRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'request_date' => ['required', 'date'],
            'customer_id' => ['required', 'integer', 'exists:customers,id'],
            'scheduled_date' => ['nullable', 'date', 'after_or_equal:request_date'],
            'scheduled_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'additional_comments' => ['nullable', 'string', 'max:5000'],
            'status' => ['sometimes', Rule::in(['scheduled', 'in_progress', 'completed', 'cancelled'])],
            'items' => ['required', 'array', 'min:1'],
            'items.*.customer_owned_product_id' => ['required', 'integer', 'exists:customer_owned_products,id'],
            'items.*.coverage_type' => ['required', Rule::in(['in_warranty', 'chargeable', 'amc'])],
            'items.*.service_charges' => ['required', 'numeric', 'min:0'],
            'custom_charges' => ['sometimes', 'array', 'max:20'],
            'custom_charges.*.label' => ['required', 'string', 'max:255'],
            'custom_charges.*.amount' => ['required', 'numeric'],
        ];
    }
}
