<?php

namespace App\Http\Requests\Influencers;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class InfluencerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => is_string($this->input('name')) ? trim($this->input('name')) : $this->input('name'),
            'phone' => filled($this->input('phone')) ? trim((string) $this->input('phone')) : null,
            'email' => filled($this->input('email')) ? trim((string) $this->input('email')) : null,
            'company_name' => filled($this->input('company_name')) ? trim((string) $this->input('company_name')) : null,
            'city' => filled($this->input('city')) ? trim((string) $this->input('city')) : null,
            'notes' => filled($this->input('notes')) ? trim((string) $this->input('notes')) : null,
        ]);
    }

    public function rules(): array
    {
        $existingType = $this->route('id') ? \App\Models\Influencer::find($this->route('id'))?->influencer_type : null;
        return [
            'name' => ['required', 'string', 'max:255'],
            'influencer_type' => ['required', 'string', 'max:50', Rule::exists('influencer_types', 'code')->where(fn ($query) => $query->where(function ($query) use ($existingType) {
                $query->where('is_active', true);
                if ($existingType) $query->orWhere('code', $existingType);
            }))],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'assigned_to' => ['required', 'integer', 'exists:users,id'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->has('assigned_to')) {
                return;
            }

            $user = User::query()->find($this->integer('assigned_to'));

            if (! $user?->is_active || ! in_array('sales', (array) $user->departments, true)) {
                $validator->errors()->add('assigned_to', 'Select an active user from the Sales department.');
            }
        }];
    }
}
