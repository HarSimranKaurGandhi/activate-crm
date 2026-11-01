<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            $table->unsignedTinyInteger('closure_hot_level')->default(1)->after('expected_closure');
            $table->index('closure_hot_level');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            $table->dropIndex(['closure_hot_level']);
            $table->dropColumn('closure_hot_level');
        });
    }
};
