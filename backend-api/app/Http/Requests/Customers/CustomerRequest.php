<?php

namespace App\Http\Requests\Customers;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CustomerRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $phone = preg_replace('/\D+/', '', (string) $this->input('phone', ''));
        if (strlen($phone) > 10 && str_starts_with($phone, '91')) {
            $phone = substr($phone, -10);
        }

        $this->merge([
            'phone' => $phone,
            'email' => filled($this->input('email')) ? strtolower(trim((string) $this->input('email'))) : null,
            'customer_importance' => filled($this->input('customer_importance'))
                ? strtoupper(trim((string) $this->input('customer_importance')))
                : null,
            'customer_category' => filled($this->input('customer_category'))
                ? strtoupper(trim((string) $this->input('customer_category')))
                : null,
        ]);
    }

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $customerId = $this->route('id');

        return [
            'primary_name' => ['required', 'string', 'max:255'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('customers', 'email')->ignore($customerId)],
            'phone' => ['required', 'digits:10', Rule::unique('customers', 'phone')->ignore($customerId)],
            'address_line_1' => ['required', 'string', 'max:255'],
            'address_line_2' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['required', 'string', 'max:100'],
            'pincode' => ['nullable', 'string', 'max:20'],
            'country' => ['required', 'string', 'max:100'],
            'rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'customer_importance' => ['nullable', 'string', Rule::in(['UVIP', 'VIP', 'IMP'])],
            'customer_category' => ['nullable', 'string', Rule::in(['GYM OWNER', 'GOVT OFFICIAL', 'BUILDER', 'CORPORATE', 'DEALER'])],
            'notes' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
            'custom_fields' => ['sometimes', 'array'],
            'custom_fields.*.field_definition_id' => ['nullable', 'required_without:custom_fields.*.field_key', 'exists:customer_field_definitions,id'],
            'custom_fields.*.field_key' => ['nullable', 'required_without:custom_fields.*.field_definition_id', 'exists:customer_field_definitions,field_key'],
            'custom_fields.*.value' => ['nullable'],
        ];
    }

    public function messages(): array
    {
        return [
            'phone.digits' => 'Phone number must contain exactly 10 digits.',
            'phone.unique' => 'A customer with this phone number already exists.',
            'email.unique' => 'A customer with this email address already exists.',
        ];
    }
}
