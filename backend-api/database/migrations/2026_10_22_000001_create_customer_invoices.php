<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_invoices', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->string('invoice_number', 100)->nullable();
            $table->date('invoice_date')->nullable();
            $table->string('file_path');
            $table->string('file_name');
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
        Schema::table('customer_owned_products', function (Blueprint $table): void {
            // A single reference ensures an owned product belongs to at most one invoice.
            $table->foreignId('customer_invoice_id')->nullable()->constrained('customer_invoices')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('customer_owned_products', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('customer_invoice_id');
        });
        Schema::dropIfExists('customer_invoices');
    }
};
