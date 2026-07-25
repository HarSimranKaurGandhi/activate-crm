<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $this->normalizeTable('leads');
        $this->normalizeTable('customers');
    }

    public function down(): void
    {
        // Normalized phone numbers cannot be reliably restored to their old formatting.
    }

    private function normalizeTable(string $table): void
    {
        DB::table($table)
            ->whereNotNull('phone')
            ->orderBy('id')
            ->each(function (object $record) use ($table): void {
                $normalized = $this->normalizePhone((string) $record->phone);

                if ($normalized === null || $normalized === $record->phone) {
                    return;
                }

                DB::table($table)->where('id', $record->id)->update([
                    'phone' => $normalized,
                ]);
            });
    }

    private function normalizePhone(string $phone): ?string
    {
        $digits = preg_replace('/\D+/', '', trim($phone)) ?? '';

        if (strlen($digits) === 12 && str_starts_with($digits, '91')) {
            $digits = substr($digits, 2);
        } elseif (strlen($digits) === 11 && str_starts_with($digits, '0')) {
            $digits = substr($digits, 1);
        }

        return strlen($digits) === 10 ? $digits : null;
    }
};
