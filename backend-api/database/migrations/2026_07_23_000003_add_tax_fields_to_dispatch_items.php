<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('dispatch_items', function (Blueprint $table): void {
            $table->string('hsn_code', 50)->nullable()->after('product_id');
            $table->decimal('gst_percent', 7, 3)->default(0)->after('hsn_code');
        });
        DB::statement('UPDATE dispatch_items di INNER JOIN products p ON p.id = di.product_id SET di.hsn_code = p.hsn_code, di.gst_percent = COALESCE(p.gst_percent, 0)');
    }
    public function down(): void
    {
        Schema::table('dispatch_items', function (Blueprint $table): void {
            $table->dropColumn(['hsn_code', 'gst_percent']);
        });
    }
};
