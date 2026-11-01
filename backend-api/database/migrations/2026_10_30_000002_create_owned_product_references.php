<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up(): void { Schema::create('owned_product_references',function(Blueprint $t){
  $t->id();$t->foreignId('customer_owned_product_id')->constrained('customer_owned_products')->cascadeOnDelete();
  $t->string('serial_number',100)->nullable();$t->string('image_path')->nullable();$t->date('purchase_date');$t->decimal('quantity',14,3);$t->timestamps();
 }); }
 public function down(): void { Schema::dropIfExists('owned_product_references'); }
};
