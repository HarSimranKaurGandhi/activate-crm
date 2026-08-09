<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('amcs', function (Blueprint $table) {
            $table->decimal('additional_charges', 14, 2)->default(0)->after('additional_comments');
        });
    }

    public function down(): void
    {
        Schema::table('amcs', function (Blueprint $table) {
            $table->dropColumn('additional_charges');
        });
    }
};
