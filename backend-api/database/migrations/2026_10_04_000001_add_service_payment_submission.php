<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::table('service_requests', function (Blueprint $table): void {
            $table->timestamp('payment_submitted_at')->nullable();
            $table->foreignId('payment_submitted_by')->nullable()->constrained('users')->nullOnDelete();
        });
    }
    public function down(): void {
        Schema::table('service_requests', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('payment_submitted_by');
            $table->dropColumn('payment_submitted_at');
        });
    }
};
