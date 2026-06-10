<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotations', function (Blueprint $table): void {
            if (! Schema::hasColumn('quotations', 'round_off_net_amount_to_customer')) {
                $table->boolean('round_off_net_amount_to_customer')->default(false)->after('show_item_wise_gst_to_customer');
            }
        });
    }

    public function down(): void
    {
        Schema::table('quotations', function (Blueprint $table): void {
            if (Schema::hasColumn('quotations', 'round_off_net_amount_to_customer')) {
                $table->dropColumn('round_off_net_amount_to_customer');
            }
        });
    }
};
