<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TaxInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        return $user && ($user->hasAnyRole(['admin']) || $user->modulePermissions()->where('module', 'billing')->where('can_view', true)->where('can_edit', true)->exists());
    }

    public function rules(): array
    {
        return [
            'dispatch_id' => ['required', 'integer', 'exists:dispatches,id'],
            'source_token' => ['required', 'string', 'size:64'],
            'invoice_date' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'due_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:invoice_date'],
            'tax_mode' => ['required', 'in:igst,cgst_sgst,cgst_utgst'],
            'place_of_supply' => ['required', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:3000'],
            'hsn_codes' => ['sometimes', 'array', 'max:1000'],
            'hsn_codes.*.dispatch_item_id' => ['required', 'integer', 'distinct'],
            'hsn_codes.*.hsn_code' => ['required', 'string', 'regex:/^\d{4,8}$/'],
        ];
    }
}
