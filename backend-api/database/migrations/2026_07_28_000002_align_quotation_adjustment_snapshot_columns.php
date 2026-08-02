<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('quotation_adjustments', 'label') && ! Schema::hasColumn('quotation_adjustments', 'name')) {
            DB::statement('ALTER TABLE quotation_adjustments CHANGE label name VARCHAR(255) NOT NULL');
        }

        if (Schema::hasColumn('quotation_adjustments', 'entered_value') && ! Schema::hasColumn('quotation_adjustments', 'value')) {
            DB::statement('ALTER TABLE quotation_adjustments CHANGE entered_value value DECIMAL(15,2) NOT NULL DEFAULT 0.00');
        }

        if (Schema::hasColumn('quotation_adjustments', 'calculated_amount') && ! Schema::hasColumn('quotation_adjustments', 'amount')) {
            DB::statement('ALTER TABLE quotation_adjustments CHANGE calculated_amount amount DECIMAL(15,2) NOT NULL DEFAULT 0.00');
        }

        DB::statement('ALTER TABLE quotation_adjustments MODIFY adjustment_type VARCHAR(30) NOT NULL');

        if (! Schema::hasColumn('quotation_adjustments', 'code')) {
            Schema::table('quotation_adjustments', function (Blueprint $table): void {
                $table->string('code', 100)->nullable()->after('name');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('quotation_adjustments', 'code')) {
            Schema::table('quotation_adjustments', function (Blueprint $table): void {
                $table->dropColumn('code');
            });
        }

        DB::statement("UPDATE quotation_adjustments SET adjustment_type = CASE WHEN adjustment_type = 'discount' THEN 'subtract' ELSE 'add' END");
        DB::statement("ALTER TABLE quotation_adjustments MODIFY adjustment_type ENUM('add','subtract') NOT NULL");

        if (Schema::hasColumn('quotation_adjustments', 'name') && ! Schema::hasColumn('quotation_adjustments', 'label')) {
            DB::statement('ALTER TABLE quotation_adjustments CHANGE name label VARCHAR(150) NOT NULL');
        }

        if (Schema::hasColumn('quotation_adjustments', 'value') && ! Schema::hasColumn('quotation_adjustments', 'entered_value')) {
            DB::statement('ALTER TABLE quotation_adjustments CHANGE value entered_value DECIMAL(15,2) NOT NULL DEFAULT 0.00');
        }

        if (Schema::hasColumn('quotation_adjustments', 'amount') && ! Schema::hasColumn('quotation_adjustments', 'calculated_amount')) {
            DB::statement('ALTER TABLE quotation_adjustments CHANGE amount calculated_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00');
        }
    }
};
