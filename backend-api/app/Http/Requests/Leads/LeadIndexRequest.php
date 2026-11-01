<?php

namespace App\Http\Requests\Leads;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LeadIndexRequest extends FormRequest
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
            'include_closed' => ['sometimes', 'boolean'],
            'favourites_only' => ['sometimes', 'boolean'],
            'favourite_user_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'search' => ['sometimes', 'nullable', 'string', 'max:255'],
            'lead_source' => ['sometimes', 'array'],
            'lead_source.*' => ['required', Rule::in(['walk_in', 'reference', 'india_mart', 'website', 'johnson', 'hercules', 'affiliate'])],
            'lead_source_operator' => ['sometimes', Rule::in(['is', 'is_not'])],
            'status' => ['sometimes', 'array'],
            'status.*' => ['required', Rule::in(['new', 'enquiry', 'in_progress', 'on_hold', 'order_confirmed', 'closed_success', 'closed_fail'])],
            'status_operator' => ['sometimes', Rule::in(['is', 'is_not'])],
            'tag' => ['sometimes', 'nullable', Rule::in(['hot', 'premium'])],
            'created_by' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'assigned_to' => ['sometimes', 'array'],
            'assigned_to.*' => ['required', 'integer', 'exists:users,id'],
            'assigned_to_operator' => ['sometimes', Rule::in(['is', 'is_not'])],
            'follow_up_from' => ['sometimes', 'nullable', 'date'],
            'follow_up_to' => ['sometimes', 'nullable', 'date', 'after_or_equal:follow_up_from'],
            'sort_by' => ['sometimes', Rule::in(['name', 'lead_source', 'assigned_to', 'follow_up_date', 'created_at', 'status'])],
            'sort_direction' => ['sometimes', Rule::in(['asc', 'desc'])],
        ];
    }

    protected function prepareForValidation(): void
    {
        $filters = [];

        foreach (['lead_source', 'status', 'assigned_to'] as $field) {
            $value = $this->input($field);

            if ($value !== null && ! is_array($value)) {
                $filters[$field] = [$value];
            }
        }

        if ($filters !== []) {
            $this->merge($filters);
        }
    }
}
