<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            if (! Schema::hasColumn('leads', 'expected_closure')) {
                $table->string('expected_closure', 20)->nullable()->after('expected_order_value');
            }
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            if (Schema::hasColumn('leads', 'expected_closure')) {
                $table->dropColumn('expected_closure');
            }
        });
    }
};
