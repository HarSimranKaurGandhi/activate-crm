<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('inventory_movements', function (Blueprint $table): void {
            $table->foreignId('customer_id')->nullable()->after('transport_type')->constrained()->nullOnDelete();
            $table->foreignId('dispatch_id')->nullable()->unique()->after('customer_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('inventory_movements', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('dispatch_id');
            $table->dropConstrainedForeignId('customer_id');
        });
    }
};
