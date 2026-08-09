<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_module_permissions', function (Blueprint $table): void {
            $table->boolean('can_view')->default(true)->after('module');
            $table->boolean('can_edit')->default(true)->after('can_view');
        });
    }

    public function down(): void
    {
        Schema::table('user_module_permissions', function (Blueprint $table): void {
            $table->dropColumn(['can_view', 'can_edit']);
        });
    }
};
