<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            if (! Schema::hasColumn('leads', 'assigned_to')) {
                $table->foreignId('assigned_to')->nullable()->after('follow_up_date')->constrained('users')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            if (Schema::hasColumn('leads', 'assigned_to')) {
                $table->dropConstrainedForeignId('assigned_to');
            }
        });
    }
};
