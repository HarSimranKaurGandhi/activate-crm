<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotations', function (Blueprint $table): void {
            if (! Schema::hasColumn('quotations', 'show_uom_to_customer')) {
                $table->boolean('show_uom_to_customer')->default(false)->after('round_off_net_amount_to_customer');
            }
        });
    }

    public function down(): void
    {
        Schema::table('quotations', function (Blueprint $table): void {
            if (Schema::hasColumn('quotations', 'show_uom_to_customer')) {
                $table->dropColumn('show_uom_to_customer');
            }
        });
    }
};
