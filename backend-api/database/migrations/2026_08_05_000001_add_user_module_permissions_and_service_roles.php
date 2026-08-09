<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_module_permissions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('module', 50);
            $table->timestamps();
            $table->unique(['user_id', 'module']);
        });

        $now = now();
        $roles = [
            [
                'name' => 'Service Manager',
                'code' => 'service_manager',
                'description' => 'Manages service requests and AMCs.',
            ],
            [
                'name' => 'Service Executive',
                'code' => 'service_executive',
                'description' => 'Handles assigned service requests and AMC visits.',
            ],
        ];

        foreach ($roles as $role) {
            DB::table('roles')->updateOrInsert(
                ['code' => $role['code']],
                [...$role, 'created_at' => $now, 'updated_at' => $now]
            );
        }

        $modules = [
            'dashboard',
            'quotations',
            'tasks',
            'leads',
            'customers',
            'products',
            'inventory',
            'dispatches',
            'services',
            'masters',
            'reports',
            'settings',
        ];
        $rows = [];

        foreach (DB::table('users')->pluck('id') as $userId) {
            foreach ($modules as $module) {
                $rows[] = [
                    'user_id' => $userId,
                    'module' => $module,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        if ($rows !== []) {
            DB::table('user_module_permissions')->insertOrIgnore($rows);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('user_module_permissions');
        DB::table('roles')->whereIn('code', ['service_manager', 'service_executive'])->delete();
    }
};
