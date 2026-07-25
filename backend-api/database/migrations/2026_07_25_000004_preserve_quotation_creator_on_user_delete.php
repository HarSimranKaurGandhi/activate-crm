<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('quotations', 'created_by_name')) {
            Schema::table('quotations', function (Blueprint $table): void {
                $table->string('created_by_name')->nullable()->after('created_by');
            });
        }

        DB::table('quotations')
            ->whereNotNull('created_by')
            ->whereNull('created_by_name')
            ->orderBy('id')
            ->each(function (object $quotation): void {
                DB::table('quotations')->where('id', $quotation->id)->update([
                    'created_by_name' => DB::table('users')
                        ->where('id', $quotation->created_by)
                        ->value('name'),
                ]);
            });

        $database = DB::connection()->getDatabaseName();
        $constraintExists = DB::table('information_schema.TABLE_CONSTRAINTS')
            ->where('CONSTRAINT_SCHEMA', $database)
            ->where('TABLE_NAME', 'quotations')
            ->where('CONSTRAINT_NAME', 'fk_quotations_created_by')
            ->exists();

        if ($constraintExists) {
            DB::statement('ALTER TABLE quotations DROP FOREIGN KEY fk_quotations_created_by');
        }

        DB::statement('ALTER TABLE quotations MODIFY created_by BIGINT UNSIGNED NULL');
        DB::statement(
            'ALTER TABLE quotations ADD CONSTRAINT fk_quotations_created_by '
            .'FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL'
        );
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE quotations DROP FOREIGN KEY fk_quotations_created_by');
        Schema::table('quotations', function (Blueprint $table): void {
            $table->dropColumn('created_by_name');
        });
        DB::statement(
            'ALTER TABLE quotations ADD CONSTRAINT fk_quotations_created_by '
            .'FOREIGN KEY (created_by) REFERENCES users(id)'
        );
    }
};
