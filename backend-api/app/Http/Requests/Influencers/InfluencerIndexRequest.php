<?php

namespace App\Http\Requests\Influencers;

use Illuminate\Foundation\Http\FormRequest;

class InfluencerIndexRequest extends FormRequest
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
            'assigned_to' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
