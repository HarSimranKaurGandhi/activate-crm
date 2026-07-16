<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('leads', 'phone')) {
            return;
        }

        DB::statement('ALTER TABLE `leads` MODIFY `phone` VARCHAR(30) NULL');
    }

    public function down(): void
    {
        if (! Schema::hasColumn('leads', 'phone')) {
            return;
        }

        DB::statement('ALTER TABLE `leads` MODIFY `phone` VARCHAR(30) NOT NULL');
    }
};
