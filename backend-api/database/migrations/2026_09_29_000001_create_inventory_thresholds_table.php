<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('inventory_thresholds', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('style', 100)->default('');
            $table->decimal('quantity', 14, 3);
            $table->timestamps();
            $table->unique(['product_id', 'style']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_thresholds');
    }
};
