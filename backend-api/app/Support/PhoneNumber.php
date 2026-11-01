<?php

namespace App\Support;

final class PhoneNumber
{
    public static function normalizeIndian(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        if (! is_scalar($value)) {
            return null;
        }
        $digits = preg_replace('/\D+/', '', (string) $value);

        return strlen($digits) === 12 && str_starts_with($digits, '91')
            ? substr($digits, 2)
            : $digits;
    }
}
