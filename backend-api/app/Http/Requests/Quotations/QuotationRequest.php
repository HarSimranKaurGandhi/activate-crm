<?php

namespace App\Http\Requests\Quotations;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class QuotationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'customer_id' => ['nullable', 'exists:customers,id', 'required_without:lead_id'],
            'lead_id' => ['nullable', 'exists:leads,id', 'required_without:customer_id'],
            'salesperson_name' => ['nullable', 'string', 'max:255'],
            'salesperson_phone' => ['nullable', 'string', 'max:30'],
            'salesperson_email' => ['nullable', 'email', 'max:255'],
            'quote_date' => ['required', 'date'],
            'valid_until' => ['nullable', 'date', 'after_or_equal:quote_date'],
            'pricing_mode' => ['required', Rule::in(['exclusive_gst', 'inclusive_gst'])],
            'show_discount_to_customer' => ['sometimes', 'boolean'],
            'show_mrp_to_customer' => ['sometimes', 'boolean'],
            'show_item_wise_gst_to_customer' => ['sometimes', 'boolean'],
            'round_off_net_amount_to_customer' => ['sometimes', 'boolean'],
            'show_uom_to_customer' => ['sometimes', 'boolean'],
            'show_brand_banner_to_customer' => ['sometimes', 'boolean'],
            'brand_banner_id' => ['nullable', 'integer', 'exists:brands,id', 'required_if:show_brand_banner_to_customer,true'],
            'default_discount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'default_discount_amount' => ['nullable', 'numeric', 'min:0'],
            'intro_text' => ['nullable', 'string'],
            'remarks' => ['nullable', 'string'],
            'internal_notes' => ['nullable', 'string'],
            'status' => ['sometimes', Rule::in(['draft', 'pending_approval', 'approved', 'rejected', 'revised'])],
            'internal_remarks' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.sort_order' => ['sometimes', 'integer', 'min:0'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'items.*.edited_price' => ['nullable', 'numeric', 'min:0'],
            'items.*.discount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'items.*.discount_amount' => ['nullable', 'numeric', 'min:0'],
            'adjustments' => ['sometimes', 'array'],
            'adjustments.*.adjustment_master_id' => ['required_with:adjustments', 'exists:adjustment_masters,id'],
            'adjustments.*.value' => ['nullable', 'numeric'],
            'adjustments.*.display_order' => ['sometimes', 'integer', 'min:0'],
            'terms' => ['sometimes', 'array'],
            'terms.*.term_master_id' => ['required_with:terms', 'exists:term_masters,id'],
            'terms.*.display_order' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
