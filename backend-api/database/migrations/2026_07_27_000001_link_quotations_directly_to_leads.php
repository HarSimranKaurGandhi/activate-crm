<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE quotations MODIFY customer_id BIGINT UNSIGNED NULL');

        if (! Schema::hasColumn('quotations', 'lead_id')) {
            Schema::table('quotations', function (Blueprint $table): void {
                $table->foreignId('lead_id')->nullable()->after('customer_id')->constrained()->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::table('quotations', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('lead_id');
        });
    }
};
