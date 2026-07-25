<?php

namespace App\Http\Requests\Users;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DeleteUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'replacement_user_id' => [
                'required',
                'integer',
                Rule::notIn([(int) $this->route('id')]),
                Rule::exists('users', 'id')->where('is_active', true),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'replacement_user_id.required' => 'Select a user to receive the leads and tasks.',
            'replacement_user_id.not_in' => 'The replacement must be a different user.',
            'replacement_user_id.exists' => 'Select an active replacement user.',
        ];
    }
}
