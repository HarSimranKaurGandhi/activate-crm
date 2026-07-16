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
            'phone' => ['nullable', 'string', 'max:30', 'required_without:email'],
            'email' => ['nullable', 'email', 'max:255', 'required_without:phone'],
            'address_line_1' => ['sometimes', 'nullable', 'string', 'max:255'],
            'address_line_2' => ['sometimes', 'nullable', 'string', 'max:255'],
            'city' => ['sometimes', 'nullable', 'string', 'max:100'],
            'state' => ['sometimes', 'nullable', 'string', 'max:100'],
            'pincode' => ['sometimes', 'nullable', 'string', 'max:20'],
            'country' => ['sometimes', 'nullable', 'string', 'max:100'],
            'requirement' => ['required', 'string'],
            'expected_order_value' => ['nullable', 'string', Rule::in(['5L-10L', '10L-30L', '30L+']), 'required_if:status,in_progress'],
            'expected_closure' => ['nullable', 'string', Rule::in(['10 day', '20', '30', '90']), 'required_if:status,in_progress'],
            'status' => ['required', Rule::in(['new', 'in_progress', 'on_hold', 'closed_success', 'closed_fail'])],
            'tags' => ['sometimes', 'nullable', 'array'],
            'tags.*' => ['string', Rule::in(['hot', 'premium'])],
            'follow_up_date' => ['required', 'date', 'after_or_equal:today'],
            'assigned_to' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
