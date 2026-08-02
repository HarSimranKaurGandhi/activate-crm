<?php

namespace App\Http\Requests\Leads;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'lead_source' => ['required', Rule::in(['walk_in', 'reference', 'india_mart', 'website'])],
            'name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'digits:10', 'required_without:email'],
            'email' => ['nullable', 'email', 'max:255', 'required_without:phone'],
            'address_line_1' => ['sometimes', 'nullable', 'string', 'max:255'],
            'address_line_2' => ['sometimes', 'nullable', 'string', 'max:255'],
            'city' => ['sometimes', 'nullable', 'string', 'max:100'],
            'state' => ['sometimes', 'nullable', 'string', 'max:100'],
            'pincode' => ['sometimes', 'nullable', 'string', 'max:20'],
            'country' => ['sometimes', 'nullable', 'string', 'max:100'],
            'requirement' => ['required', 'string'],
            'expected_order_value' => ['nullable', 'string', Rule::in(['Less Than 1L', '1L-5L', '5L-10L', '10L-30L', '30L+']), 'required_if:status,in_progress'],
            'expected_closure' => ['nullable', 'string', Rule::in(['10 days', '20 days', '30 days', '90 days']), 'required_if:status,in_progress'],
            'status' => ['required', Rule::in(['new', 'enquiry', 'in_progress', 'on_hold', 'closed_success', 'closed_fail'])],
            'failure_reason' => [
                'nullable',
                Rule::in(['lost_to_competitor', 'no_enquiry_made', 'lost_interest', 'no_response', 'didnt_like_product', 'product_not_available', 'other']),
                'required_if:status,closed_fail',
            ],
            'failure_reason_details' => ['nullable', 'string', 'max:2000', 'required_if:failure_reason,other'],
            'tags' => ['sometimes', 'nullable', 'array'],
            'tags.*' => ['string', Rule::in(['hot', 'premium'])],
            'follow_up_date' => ['required', 'date', 'after_or_equal:today'],
            'assigned_to' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $expectedClosure = match (strtolower(trim((string) $this->input('expected_closure', '')))) {
            '10 day', '10 days' => '10 days',
            '20', '20 day', '20 days' => '20 days',
            '30', '30 day', '30 days' => '30 days',
            '90', '90 day', '90 days' => '90 days',
            default => $this->input('expected_closure'),
        };

        $this->merge([
            'expected_closure' => $expectedClosure,
            'failure_reason' => $this->input('status') === 'closed_fail' ? $this->input('failure_reason') : null,
            'failure_reason_details' => $this->input('status') === 'closed_fail' && $this->input('failure_reason') === 'other'
                ? $this->input('failure_reason_details')
                : null,
        ]);
    }

    public function messages(): array
    {
        return [
            'phone.digits' => 'Phone number must contain exactly 10 digits.',
        ];
    }
}
