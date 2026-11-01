<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('influencers', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('phone', 30)->nullable();
            $table->string('email')->nullable();
            $table->string('company_name')->nullable();
            $table->string('city', 100)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('assigned_to')->constrained('users')->restrictOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['is_active', 'name']);
            $table->index('assigned_to');
        });

        Schema::table('leads', function (Blueprint $table): void {
            $table->foreignId('influencer_id')
                ->nullable()
                ->after('assigned_to')
                ->constrained('influencers')
                ->nullOnDelete();
        });

        $now = now();
        $permissions = DB::table('users')->pluck('id')->map(fn ($userId) => [
            'user_id' => $userId,
            'module' => 'influencers',
            'can_view' => true,
            'can_edit' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ])->all();

        if ($permissions !== []) {
            DB::table('user_module_permissions')->insertOrIgnore($permissions);
        }
    }

    public function down(): void
    {
        DB::table('user_module_permissions')->where('module', 'influencers')->delete();

        Schema::table('leads', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('influencer_id');
        });

        Schema::dropIfExists('influencers');
    }
};
