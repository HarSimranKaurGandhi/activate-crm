<?php

namespace App\Http\Requests\Users;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:30'],
            'designation' => ['nullable', 'string', 'max:255'],
            'password' => ['required', 'string', 'min:8'],
            'role_id' => ['required', 'exists:roles,id'],
            'is_active' => ['sometimes', 'boolean'],
            'module_permissions' => ['sometimes', 'array'],
            'module_permissions.*' => ['array:module,can_view,can_edit'],
            'module_permissions.*.module' => ['required', 'string', 'distinct', 'in:dashboard,quotations,tasks,leads,customers,products,inventory,dispatches,services,masters,reports,settings'],
            'module_permissions.*.can_view' => ['required', 'boolean'],
            'module_permissions.*.can_edit' => ['required', 'boolean'],
        ];
    }
}
