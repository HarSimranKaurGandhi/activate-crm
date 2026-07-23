<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('godowns', function (Blueprint $table): void {
            $table->id();
            $table->string('name')->unique();
            $table->string('address')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('inventory_movements', function (Blueprint $table): void {
            $table->id();
            $table->date('movement_date');
            $table->enum('movement_type', ['in', 'out']);
            $table->enum('transport_type', ['freight_vehicle', 'courier']);
            $table->string('slip_path')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('inventory_movement_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('inventory_movement_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('godown_id')->constrained()->restrictOnDelete();
            $table->decimal('quantity', 14, 3);
            $table->unsignedInteger('packages')->default(0);
            $table->timestamps();
        });

        Schema::create('inventory_stocks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('godown_id')->constrained()->cascadeOnDelete();
            $table->decimal('quantity', 14, 3)->default(0);
            $table->timestamps();
            $table->unique(['product_id', 'godown_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_stocks');
        Schema::dropIfExists('inventory_movement_items');
        Schema::dropIfExists('inventory_movements');
        Schema::dropIfExists('godowns');
    }
};
