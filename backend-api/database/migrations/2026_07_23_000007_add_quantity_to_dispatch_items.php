<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('dispatch_items', function (Blueprint $table): void {
            $table->decimal('quantity', 14, 3)->default(1)->after('product_id');
        });
    }

    public function down(): void
    {
        Schema::table('dispatch_items', function (Blueprint $table): void {
            $table->dropColumn('quantity');
        });
    }
};
