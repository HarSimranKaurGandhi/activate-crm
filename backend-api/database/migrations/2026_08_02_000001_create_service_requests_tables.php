<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_requests', function (Blueprint $table): void {
            $table->id();
            $table->string('service_number')->unique();
            $table->foreignId('customer_id')->constrained()->restrictOnDelete();
            $table->date('request_date');
            $table->date('scheduled_date')->nullable();
            $table->foreignId('scheduled_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('additional_comments')->nullable();
            $table->string('status')->default('scheduled');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['status', 'scheduled_date']);
        });

        Schema::create('service_request_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('service_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('customer_owned_product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('machine_name');
            $table->string('model_number')->nullable();
            $table->string('brand')->nullable();
            $table->string('coverage_type');
            $table->decimal('service_charges', 14, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('service_request_charges', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('service_request_id')->constrained()->cascadeOnDelete();
            $table->string('label');
            $table->decimal('amount', 14, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_request_charges');
        Schema::dropIfExists('service_request_items');
        Schema::dropIfExists('service_requests');
    }
};
