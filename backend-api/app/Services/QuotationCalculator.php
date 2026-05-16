<?php

namespace App\Services;

use App\Models\Product;

class QuotationCalculator
{
    public function buildItemSnapshot(array $item, array $defaults): array
    {
        $product = Product::query()->with('images')->findOrFail($item['product_id']);
        $quantity = (float) ($item['quantity'] ?? 1);
        $basePrice = (float) ($product->mrp ?? $product->usual_selling_price);
        $editedPrice = (float) ($item['edited_price'] ?? $basePrice);
        $discountPercent = (float) ($item['discount_percent'] ?? $defaults['default_discount_percent'] ?? 0);
        $discountAmount = (float) ($item['discount_amount'] ?? $defaults['default_discount_amount'] ?? 0);

        if ($discountAmount <= 0 && $discountPercent > 0) {
            $discountAmount = round(($editedPrice * $discountPercent) / 100, 2);
        }

        if ($discountAmount <= 0 && $discountPercent <= 0 && $editedPrice < $basePrice) {
            $discountAmount = round($basePrice - $editedPrice, 2);
            $discountPercent = $basePrice > 0 ? round(($discountAmount / $basePrice) * 100, 2) : 0;
        }

        $priceAfterDiscount = max($editedPrice - $discountAmount, 0);
        $gstPercent = (float) $product->gst_percent;

        if (($defaults['pricing_mode'] ?? 'exclusive_gst') === 'inclusive_gst') {
            $taxable = round(($priceAfterDiscount * 100) / (100 + $gstPercent), 2);
            $tax = round($priceAfterDiscount - $taxable, 2);
        } else {
            $taxable = $priceAfterDiscount;
            $tax = round(($taxable * $gstPercent) / 100, 2);
        }

        $primaryImagePath = $product->images->firstWhere('is_primary', true)?->image_path
            ?? $product->images->first()?->image_path
            ?? $product->image_path;

        return [
            'product_id' => $product->id,
            'sort_order' => (int) ($item['sort_order'] ?? 0),
            'product_name' => $product->product_name,
            'model_number' => $product->model_number,
            'specifications' => $product->specifications,
            'product_image_path' => $primaryImagePath,
            'unit' => $product->unit ?? 'nos',
            'quantity' => $quantity,
            'mrp' => $product->mrp,
            'base_price' => $product->mrp ?? $product->usual_selling_price,
            'edited_price' => $editedPrice,
            'gst_percent' => $gstPercent,
            'discount_percent' => $discountPercent,
            'discount_amount' => $discountAmount,
            'price_after_discount' => $priceAfterDiscount,
            'taxable_amount' => round($taxable * $quantity, 2),
            'tax_amount' => round($tax * $quantity, 2),
            'line_total' => round(($taxable + $tax) * $quantity, 2),
        ];
    }
}
