<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class InventoryMovementRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'movement_date' => ['required', 'date'],
            'movement_type' => ['required', Rule::in(['in', 'out'])],
            'transport_type' => ['required', Rule::in(['freight_vehicle', 'courier'])],
            'customer_id' => ['nullable', 'integer', 'exists:customers,id'],
            'dispatch_id' => ['nullable', 'integer', 'exists:dispatches,id', 'unique:inventory_movements,dispatch_id'],
            'slip' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:10240'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.godown_id' => ['required', 'integer', 'exists:godowns,id'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
            'items.*.packages' => ['required', 'integer', 'min:1'],
        ];
    }
}
