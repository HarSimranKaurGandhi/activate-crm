<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create('quote_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quotation_id')->nullable()->unique()->constrained('quotations')->cascadeOnDelete();
            $table->string('quote_number', 100)->nullable()->unique();
            $table->decimal('amount', 14, 2)->nullable();
            $table->string('payment_status', 20)->default('pending');
            $table->string('file_path')->nullable();
            $table->string('file_name')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('quote_payments'); }
};
