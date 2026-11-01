<?php

namespace App\Http\Requests\Leads;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class LeadBulkUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'lead_ids' => ['required', 'array', 'min:1', 'max:500'],
            'lead_ids.*' => ['required', 'integer', 'distinct', 'exists:leads,id'],
            'status' => ['sometimes', 'string', Rule::in(['new', 'enquiry', 'in_progress', 'on_hold', 'order_confirmed', 'closed_success', 'closed_fail'])],
            'assigned_to' => ['sometimes', 'integer', 'exists:users,id'],
            'follow_up_date' => ['sometimes', 'date', 'after_or_equal:today'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (in_array($this->input('status'), ['closed_success', 'closed_fail'], true)) {
            $this->merge(['follow_up_date' => now()->toDateString()]);
        }
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if (! $this->hasAny(['status', 'assigned_to', 'follow_up_date'])) {
                    $validator->errors()->add('bulk_update', 'Select at least one field to update.');
                }
            },
        ];
    }
}
