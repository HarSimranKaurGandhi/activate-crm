<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE quotations MODIFY status ENUM('draft','pending_approval','approved','shared_with_client','locked','executed','rejected','revised','sent','expired','converted') NOT NULL DEFAULT 'draft'");
        }

        DB::table('quotations')->where('status', 'shared_with_client')->update(['status' => 'locked']);

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE quotations MODIFY status ENUM('draft','pending_approval','approved','locked','executed','rejected','revised','sent','expired','converted') NOT NULL DEFAULT 'draft'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE quotations MODIFY status ENUM('draft','pending_approval','approved','shared_with_client','locked','executed','rejected','revised','sent','expired','converted') NOT NULL DEFAULT 'draft'");
        }

        DB::table('quotations')->whereIn('status', ['locked', 'executed'])->update(['status' => 'shared_with_client']);

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE quotations MODIFY status ENUM('draft','pending_approval','approved','shared_with_client','rejected','revised','sent','expired','converted') NOT NULL DEFAULT 'draft'");
        }
    }
};
