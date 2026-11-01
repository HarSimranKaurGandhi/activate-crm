<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::table('oems', function (Blueprint $table) {
            $table->string('dealer_code')->nullable();
            $table->string('dealer_name')->nullable();
            $table->string('dealer_city')->nullable();
            $table->text('request_template')->nullable();
        });
        Schema::table('spare_part_requests', function (Blueprint $table) {
            $table->string('serial_number')->nullable();
            $table->string('invoice_number')->nullable();
            $table->string('invoice_image_path')->nullable();
        });
    }
    public function down(): void {
        Schema::table('oems', fn (Blueprint $table) => $table->dropColumn(['dealer_code', 'dealer_name', 'dealer_city', 'request_template']));
        Schema::table('spare_part_requests', fn (Blueprint $table) => $table->dropColumn(['serial_number', 'invoice_number', 'invoice_image_path']));
    }
};
