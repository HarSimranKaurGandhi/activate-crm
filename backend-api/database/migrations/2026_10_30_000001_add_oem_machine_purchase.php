<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up(): void { Schema::table('spare_part_requests', function(Blueprint $t){$t->foreignId('customer_owned_product_id')->nullable()->constrained('customer_owned_products')->nullOnDelete();$t->date('purchase_date')->nullable();}); }
 public function down(): void { Schema::table('spare_part_requests', function(Blueprint $t){$t->dropConstrainedForeignId('customer_owned_product_id');$t->dropColumn('purchase_date');}); }
};
