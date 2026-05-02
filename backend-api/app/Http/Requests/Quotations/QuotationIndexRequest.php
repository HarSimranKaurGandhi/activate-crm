<?php

namespace App\Http\Requests\Quotations;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class QuotationIndexRequest extends FormRequest
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
            'from_date' => ['sometimes', 'nullable', 'date'],
            'to_date' => ['sometimes', 'nullable', 'date', 'after_or_equal:from_date'],
            'status' => ['sometimes', 'nullable', Rule::in(['draft', 'pending_approval', 'approved', 'rejected', 'revised'])],
            'customer_id' => ['sometimes', 'nullable', 'integer', 'exists:customers,id'],
            'created_by' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
