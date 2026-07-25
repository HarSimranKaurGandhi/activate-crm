<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leaderboards', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('period_type', 20);
            $table->date('period_start');
            $table->date('period_end');
            $table->date('snapshot_date');
            $table->unsignedInteger('total_due_follow_ups')->default(0);
            $table->unsignedInteger('follow_ups_done')->default(0);
            $table->unsignedInteger('success_count')->default(0);
            $table->unsignedInteger('failed_count')->default(0);
            $table->unsignedInteger('pending_follow_ups')->default(0);
            $table->decimal('score', 12, 2)->default(0);
            $table->timestamp('calculated_at');
            $table->timestamps();

            $table->unique(['user_id', 'period_type', 'snapshot_date']);
            $table->index(['period_type', 'period_start', 'period_end']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leaderboards');
    }
};
