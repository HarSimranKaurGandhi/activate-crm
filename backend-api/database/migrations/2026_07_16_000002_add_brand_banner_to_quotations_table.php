<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotations', function (Blueprint $table): void {
            if (! Schema::hasColumn('quotations', 'show_brand_banner_to_customer')) {
                $table->boolean('show_brand_banner_to_customer')->default(false)->after('show_uom_to_customer');
            }

            if (! Schema::hasColumn('quotations', 'brand_banner_id')) {
                $table->foreignId('brand_banner_id')->nullable()->after('show_brand_banner_to_customer')->constrained('brands')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('quotations', function (Blueprint $table): void {
            if (Schema::hasColumn('quotations', 'brand_banner_id')) {
                $table->dropConstrainedForeignId('brand_banner_id');
            }

            if (Schema::hasColumn('quotations', 'show_brand_banner_to_customer')) {
                $table->dropColumn('show_brand_banner_to_customer');
            }
        });
    }
};
