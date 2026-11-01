<?php

namespace App\Http\Requests\Dashboard;

use Illuminate\Validation\Rule;
use Illuminate\Foundation\Http\FormRequest;

class DashboardSummaryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user_id' => [
                'nullable', 'integer',
                Rule::prohibitedIf(! $this->user()?->hasAnyRole(['admin'])),
                Rule::exists('users', 'id')->where(fn ($query) => $query->whereJsonContains('departments', 'sales')->where('is_active', true)),
            ],
            'scope' => ['sometimes', 'string', 'in:mine,all'],
        ];
    }
}
