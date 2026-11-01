<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_requests', function (Blueprint $table): void {
            $table->foreignId('customer_id')->nullable()->change();
            $table->string('temporary_customer_name')->nullable()->after('customer_id');
            $table->string('temporary_customer_phone', 20)->nullable()->after('temporary_customer_name');
            $table->text('temporary_customer_address')->nullable()->after('temporary_customer_phone');
        });
    }

    public function down(): void
    {
        Schema::table('service_requests', function (Blueprint $table): void {
            $table->dropColumn([
                'temporary_customer_name',
                'temporary_customer_phone',
                'temporary_customer_address',
            ]);
            $table->foreignId('customer_id')->nullable(false)->change();
        });
    }
};
