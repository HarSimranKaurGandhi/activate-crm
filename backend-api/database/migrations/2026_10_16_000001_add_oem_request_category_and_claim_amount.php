<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::table('spare_part_requests', function (Blueprint $table) {
            $table->string('request_category', 30)->default('spare_part');
            $table->decimal('claim_amount', 12, 2)->nullable();
        });
    }
    public function down(): void {
        Schema::table('spare_part_requests', function (Blueprint $table) {
            $table->dropColumn(['request_category', 'claim_amount']);
        });
    }
};
