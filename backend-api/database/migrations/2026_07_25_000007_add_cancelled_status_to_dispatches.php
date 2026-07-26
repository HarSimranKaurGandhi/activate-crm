<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(
            "ALTER TABLE dispatches MODIFY status ENUM('new','invoiced','dispatched','cancelled') NOT NULL DEFAULT 'new'"
        );
    }

    public function down(): void
    {
        DB::table('dispatches')->where('status', 'cancelled')->update(['status' => 'new']);
        DB::statement(
            "ALTER TABLE dispatches MODIFY status ENUM('new','invoiced','dispatched') NOT NULL DEFAULT 'new'"
        );
    }
};
