<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('dispatches', function (Blueprint $table): void {
            $table->date('planned_dispatch_date')->nullable()->after('dispatch_date');
        });
        DB::statement('ALTER TABLE dispatch_items MODIFY product_id BIGINT UNSIGNED NULL');
    }

    public function down(): void
    {
        DB::statement('DELETE FROM dispatch_items WHERE product_id IS NULL');
        DB::statement('ALTER TABLE dispatch_items MODIFY product_id BIGINT UNSIGNED NOT NULL');
        Schema::table('dispatches', function (Blueprint $table): void {
            $table->dropColumn('planned_dispatch_date');
        });
    }
};
