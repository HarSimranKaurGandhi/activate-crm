<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(
            "ALTER TABLE quotations MODIFY status ENUM('draft','pending_approval','approved','shared_with_client','rejected','revised','sent','expired','converted') NOT NULL DEFAULT 'draft'"
        );
    }

    public function down(): void
    {
        DB::table('quotations')
            ->where('status', 'shared_with_client')
            ->update(['status' => 'approved']);

        DB::statement(
            "ALTER TABLE quotations MODIFY status ENUM('draft','pending_approval','approved','rejected','revised','sent','expired','converted') NOT NULL DEFAULT 'draft'"
        );
    }
};
