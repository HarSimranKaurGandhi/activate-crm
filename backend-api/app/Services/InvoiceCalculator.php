<?php

namespace App\Services;

use Illuminate\Validation\ValidationException;

class InvoiceCalculator
{
    public function calculate(array $items, string $taxMode): array
    {
        if (! in_array($taxMode, ['igst', 'cgst_sgst', 'cgst_utgst'], true)) {
            throw ValidationException::withMessages(['tax_mode' => 'Select IGST, CGST + SGST or CGST + UTGST.']);
        }
        $groups = [];
        $lines = [];
        $totals = array_fill_keys(['taxable_value', 'igst_amount', 'cgst_amount', 'sgst_amount', 'tax_amount'], 0);
        foreach ($items as $index => $item) {
            $hsn = trim((string) ($item['hsn_code'] ?? ''));
            if (! preg_match('/^\d{4,8}$/', $hsn)) {
                throw ValidationException::withMessages(['items' => 'Enter a valid HSN/SAC code (4–8 digits) for item '.($index + 1).'.']);
            }
            $quantity = (float) $item['quantity'];
            $price = (float) $item['discounted_price'];
            $rate = (float) $item['gst_percent'];
            if (! is_finite($quantity) || ! is_finite($price) || ! is_finite($rate) || $quantity <= 0 || $price < 0 || $rate < 0 || $rate > 100) {
                throw ValidationException::withMessages(['items' => 'Invalid quantity, price or GST rate on the dispatch slip.']);
            }
            // Keep sums in paise so the lines, HSN summary and invoice totals reconcile.
            $taxable = (int) round($quantity * $price * 100);
            $igst = $taxMode === 'igst' ? (int) round($taxable * $rate / 100) : 0;
            $cgst = $taxMode !== 'igst' ? (int) round($taxable * $rate / 200) : 0;
            $values = ['taxable_value' => $taxable, 'igst_amount' => $igst, 'cgst_amount' => $cgst,
                'sgst_amount' => $cgst, 'tax_amount' => $igst + 2 * $cgst];
            $key = $hsn.'|'.number_format($rate, 3, '.', '');
            $groups[$key] ??= ['hsn_code' => $hsn, 'gst_percent' => $rate] + array_fill_keys(array_keys($totals), 0);
            foreach ($values as $field => $value) {
                $groups[$key][$field] += $value;
                $totals[$field] += $value;
            }
            $lines[] = array_merge($item, ['hsn_code' => $hsn], array_map(fn ($value) => $value / 100, $values),
                ['total' => ($taxable + $values['tax_amount']) / 100]);
        }
        foreach ($groups as &$group) {
            foreach (array_keys($totals) as $field) $group[$field] /= 100;
        }
        unset($group);
        $totals = array_map(fn ($value) => $value / 100, $totals);
        return ['items' => $lines, 'hsn_summary' => array_values($groups), 'totals' => $totals + [
            'grand_total' => round($totals['taxable_value'] + $totals['tax_amount'], 2),
        ]];
    }
}
