<?php

namespace App\Http\Requests\Users;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($this->route('id'))],
            'phone' => ['nullable', 'string', 'max:30'],
            'designation' => ['nullable', 'string', 'max:255'],
            'departments' => ['sometimes', 'array', 'max:4'],
            'departments.*' => ['required', 'string', 'distinct', 'in:sales,operations,service,marketing'],
            'password' => ['nullable', 'string', 'min:8'],
            'role_id' => ['sometimes', 'exists:roles,id'],
            'is_active' => ['sometimes', 'boolean'],
            'module_permissions' => ['sometimes', 'array'],
            'module_permissions.*' => ['array:module,can_view,can_edit'],
            'module_permissions.*.module' => ['required', 'string', 'distinct', 'in:dashboard,quotations,tasks,leads,influencers,customers,products,inventory,dispatches,billing,services,masters,reports,settings'],
            'module_permissions.*.can_view' => ['required', 'boolean'],
            'module_permissions.*.can_edit' => ['required', 'boolean'],
        ];
    }
}
