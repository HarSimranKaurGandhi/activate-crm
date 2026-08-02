<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('quotation_items', 'additional_information')) {
            Schema::table('quotation_items', function (Blueprint $table): void {
                $table->string('additional_information', 255)->nullable()->after('specifications');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('quotation_items', 'additional_information')) {
            Schema::table('quotation_items', function (Blueprint $table): void {
                $table->dropColumn('additional_information');
            });
        }
    }
};
