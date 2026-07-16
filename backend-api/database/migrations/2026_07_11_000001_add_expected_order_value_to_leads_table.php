<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            if (! Schema::hasColumn('leads', 'expected_order_value')) {
                $table->string('expected_order_value', 20)->nullable()->after('requirement');
            }
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            if (Schema::hasColumn('leads', 'expected_order_value')) {
                $table->dropColumn('expected_order_value');
            }
        });
    }
};
