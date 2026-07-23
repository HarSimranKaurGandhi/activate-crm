<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('dispatches', function (Blueprint $table): void {
            $table->id();
            $table->string('dispatch_number')->unique();
            $table->foreignId('customer_id')->constrained()->restrictOnDelete();
            $table->date('dispatch_date');
            $table->enum('status', ['new', 'invoiced', 'dispatched'])->default('new');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
        Schema::create('dispatch_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('dispatch_id')->constrained()->cascadeOnDelete();
            $table->text('requirement');
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->decimal('price', 14, 2);
            $table->decimal('discount_percent', 7, 3)->default(0);
            $table->decimal('discounted_price', 14, 2);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('dispatch_items'); Schema::dropIfExists('dispatches'); }
};
