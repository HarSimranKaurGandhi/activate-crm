<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table): void {
            $table->string('customer_importance', 10)->nullable()->after('rating');
            $table->string('customer_category', 50)->nullable()->after('customer_importance');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table): void {
            $table->dropColumn(['customer_importance', 'customer_category']);
        });
    }
};
