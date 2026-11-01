<?php
namespace App\Services;

class CustomerTaxMode
{
    public static function forState(?string $state): ?string
    {
        $state = strtolower(trim($state ?? ''));
        if ($state === '') return null;
        return in_array($state, ['chandigarh', 'ch', '04', '4'], true) ? 'cgst_utgst' : 'igst';
    }
}
