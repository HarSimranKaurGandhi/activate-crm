<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE quotations MODIFY default_discount_percent DECIMAL(8,3) NULL DEFAULT NULL');
        DB::statement('ALTER TABLE quotation_items MODIFY discount_percent DECIMAL(8,3) NOT NULL DEFAULT 0.000');
        DB::statement('ALTER TABLE quotation_item_discount_overrides MODIFY original_discount_percent DECIMAL(8,3) NULL DEFAULT NULL');
        DB::statement('ALTER TABLE quotation_item_discount_overrides MODIFY override_discount_percent DECIMAL(8,3) NULL DEFAULT NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE quotations MODIFY default_discount_percent DECIMAL(8,2) NULL DEFAULT NULL');
        DB::statement('ALTER TABLE quotation_items MODIFY discount_percent DECIMAL(8,2) NOT NULL DEFAULT 0.00');
        DB::statement('ALTER TABLE quotation_item_discount_overrides MODIFY original_discount_percent DECIMAL(8,2) NULL DEFAULT NULL');
        DB::statement('ALTER TABLE quotation_item_discount_overrides MODIFY override_discount_percent DECIMAL(8,2) NULL DEFAULT NULL');
    }
};
