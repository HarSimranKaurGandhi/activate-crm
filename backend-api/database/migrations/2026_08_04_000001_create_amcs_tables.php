<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('amcs', function (Blueprint $table): void {
            $table->id();
            $table->string('amc_number')->unique();
            $table->foreignId('customer_id')->constrained()->restrictOnDelete();
            $table->string('amc_type');
            $table->string('status')->default('new');
            $table->unsignedTinyInteger('yearly_visits');
            $table->date('start_date');
            $table->date('end_date');
            $table->text('additional_comments')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['status', 'start_date', 'end_date']);
        });

        Schema::create('amc_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('amc_id')->constrained('amcs')->cascadeOnDelete();
            $table->foreignId('customer_owned_product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('machine_name');
            $table->string('model_number')->nullable();
            $table->string('brand')->nullable();
            $table->decimal('amc_charges', 14, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('amc_visits', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('amc_id')->constrained('amcs')->cascadeOnDelete();
            $table->unsignedTinyInteger('visit_number');
            $table->date('scheduled_date');
            $table->string('status')->default('pending');
            $table->dateTime('completed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['amc_id', 'visit_number']);
            $table->index(['scheduled_date', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('amc_visits');
        Schema::dropIfExists('amc_items');
        Schema::dropIfExists('amcs');
    }
};
