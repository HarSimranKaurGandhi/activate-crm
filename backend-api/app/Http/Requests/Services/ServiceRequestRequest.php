<?php

namespace App\Http\Requests\Services;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ServiceRequestRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    protected function prepareForValidation(): void
    {
        $temporary = $this->boolean('is_temporary_customer');
        $phone = preg_replace('/\D+/', '', (string) $this->input('temporary_customer_phone', ''));

        if (strlen($phone) > 10 && str_starts_with($phone, '91')) {
            $phone = substr($phone, -10);
        }

        $this->merge([
            'is_temporary_customer' => $temporary,
            'customer_id' => $temporary ? null : $this->input('customer_id'),
            'temporary_customer_name' => $temporary ? trim((string) $this->input('temporary_customer_name', '')) : null,
            'temporary_customer_phone' => $temporary ? $phone : null,
            'temporary_customer_address' => $temporary ? trim((string) $this->input('temporary_customer_address', '')) : null,
            'items' => $temporary ? [] : $this->input('items', []),
        ]);
    }

    public function rules(): array
    {
        $temporary = $this->boolean('is_temporary_customer');

        return [
            'request_date' => ['required', 'date'],
            'is_temporary_customer' => ['required', 'boolean'],
            'customer_id' => ['nullable', Rule::requiredIf(! $temporary), 'integer', 'exists:customers,id'],
            'temporary_customer_name' => ['nullable', Rule::requiredIf($temporary), 'string', 'max:255'],
            'temporary_customer_phone' => ['nullable', Rule::requiredIf($temporary), 'digits:10'],
            'temporary_customer_address' => ['nullable', Rule::requiredIf($temporary), 'string', 'max:2000'],
            'scheduled_date' => ['nullable', 'date', 'after_or_equal:request_date'],
            'scheduled_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'additional_comments' => [$temporary ? 'required' : 'nullable', 'string', 'max:5000'],
            'status' => ['sometimes', Rule::in(['scheduled', 'in_progress', 'completed', 'cancelled'])],
            'payment_status' => ['sometimes', Rule::in(['pending', 'received', 'warranty', 'amc'])],
            'items' => [$temporary ? 'present' : 'required', 'array', $temporary ? 'size:0' : 'min:1'],
            'items.*.customer_owned_product_id' => ['required', 'integer', 'exists:customer_owned_products,id'],
            'items.*.coverage_type' => ['required', Rule::in(['in_warranty', 'chargeable', 'amc'])],
            'items.*.service_charges' => ['required', 'numeric', 'min:0'],
            'custom_charges' => ['sometimes', 'array', 'max:20'],
            'custom_charges.*.label' => ['required', 'string', 'max:255'],
            'custom_charges.*.amount' => ['required', 'numeric'],
        ];
    }

    public function messages(): array
    {
        return [
            'temporary_customer_phone.digits' => 'Temporary customer phone number must contain exactly 10 digits.',
            'additional_comments.required' => 'Describe the temporary customer service requirement in Additional Comments.',
            'items.min' => 'Please select at least one customer machine.',
        ];
    }
}
