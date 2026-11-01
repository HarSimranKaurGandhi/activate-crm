<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create('oems', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email');
            $table->timestamps();
        });
        Schema::table('spare_part_requests', function (Blueprint $table) {
            $table->foreignId('oem_id')->nullable()->constrained('oems')->restrictOnDelete();
        });
    }
    public function down(): void {
        Schema::table('spare_part_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('oem_id');
        });
        Schema::dropIfExists('oems');
    }
};
