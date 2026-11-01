<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create('spare_part_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_request_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->string('customer_name')->nullable();
            $table->string('spare_part_name');
            $table->string('machine_name');
            $table->unsignedInteger('quantity');
            $table->text('reason');
            $table->string('request_type', 30);
            $table->string('image_path')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('spare_part_requests'); }
};
