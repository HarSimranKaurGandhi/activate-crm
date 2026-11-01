<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_fulfillments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('quotation_item_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('stock_status', 30)->nullable();
            $table->text('stock_comment')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_fulfillments');
    }
};
