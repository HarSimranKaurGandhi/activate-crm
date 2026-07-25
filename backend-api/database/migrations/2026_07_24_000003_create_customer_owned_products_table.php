<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_owned_products', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->decimal('quantity', 14, 3)->default(1);
            $table->date('first_purchased_at')->nullable();
            $table->date('last_purchased_at')->nullable();
            $table->foreignId('source_dispatch_id')->nullable()->constrained('dispatches')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['customer_id', 'product_id']);
        });

        DB::table('inventory_movement_items as items')
            ->join('inventory_movements as movements', 'movements.id', '=', 'items.inventory_movement_id')
            ->where('movements.movement_type', 'out')
            ->whereNotNull('movements.dispatch_id')
            ->whereNotNull('movements.customer_id')
            ->selectRaw('movements.customer_id, items.product_id, SUM(items.quantity) as quantity, MIN(movements.movement_date) as first_date, MAX(movements.movement_date) as last_date, MAX(movements.dispatch_id) as dispatch_id')
            ->groupBy('movements.customer_id', 'items.product_id')
            ->get()
            ->each(function (object $row): void {
                DB::table('customer_owned_products')->insert([
                    'customer_id' => $row->customer_id,
                    'product_id' => $row->product_id,
                    'quantity' => $row->quantity,
                    'first_purchased_at' => $row->first_date,
                    'last_purchased_at' => $row->last_date,
                    'source_dispatch_id' => $row->dispatch_id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_owned_products');
    }
};
