<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('quotation_approvals', 'action_by_name')) {
            Schema::table('quotation_approvals', function (Blueprint $table): void {
                $table->string('action_by_name')->nullable()->after('action_by');
            });
        }

        DB::table('quotation_approvals')
            ->whereNotNull('action_by')
            ->orderBy('id')
            ->each(function (object $approval): void {
                $name = DB::table('users')->where('id', $approval->action_by)->value('name');
                DB::table('quotation_approvals')->where('id', $approval->id)->update([
                    'action_by_name' => $name,
                ]);
            });

        $database = DB::connection()->getDatabaseName();
        $constraintExists = DB::table('information_schema.TABLE_CONSTRAINTS')
            ->where('CONSTRAINT_SCHEMA', $database)
            ->where('TABLE_NAME', 'quotation_approvals')
            ->where('CONSTRAINT_NAME', 'fk_quotation_approvals_action_by')
            ->exists();

        if ($constraintExists) {
            DB::statement('ALTER TABLE quotation_approvals DROP FOREIGN KEY fk_quotation_approvals_action_by');
        }

        DB::statement('ALTER TABLE quotation_approvals MODIFY action_by BIGINT UNSIGNED NULL');
        DB::statement(
            'ALTER TABLE quotation_approvals ADD CONSTRAINT fk_quotation_approvals_action_by '
            .'FOREIGN KEY (action_by) REFERENCES users(id) ON DELETE SET NULL'
        );
    }

    public function down(): void
    {
        Schema::table('quotation_approvals', function (Blueprint $table): void {
            $table->dropForeign('fk_quotation_approvals_action_by');
            $table->foreign('action_by', 'fk_quotation_approvals_action_by')
                ->references('id')
                ->on('users')
                ->restrictOnDelete();
            $table->dropColumn('action_by_name');
        });
    }
};
