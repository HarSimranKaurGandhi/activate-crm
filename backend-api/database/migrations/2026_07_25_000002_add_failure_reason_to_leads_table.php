<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            $table->string('failure_reason', 50)->nullable()->after('status');
            $table->text('failure_reason_details')->nullable()->after('failure_reason');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            $table->dropColumn(['failure_reason', 'failure_reason_details']);
        });
    }
};
