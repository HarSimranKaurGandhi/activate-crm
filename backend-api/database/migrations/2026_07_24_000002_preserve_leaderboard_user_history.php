<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leaderboards', function (Blueprint $table): void {
            $table->string('user_name')->nullable()->after('user_id');
            $table->string('user_designation')->nullable()->after('user_name');
        });

        DB::table('leaderboards')
            ->orderBy('id')
            ->each(function (object $row): void {
                $user = DB::table('users')->where('id', $row->user_id)->first(['name', 'designation']);

                DB::table('leaderboards')->where('id', $row->id)->update([
                    'user_name' => $user?->name ?? 'Deleted User',
                    'user_designation' => $user?->designation,
                ]);
            });

        Schema::table('leaderboards', function (Blueprint $table): void {
            $table->dropForeign(['user_id']);
            $table->unsignedBigInteger('user_id')->nullable()->change();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('leaderboards', function (Blueprint $table): void {
            $table->dropForeign(['user_id']);
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->dropColumn(['user_name', 'user_designation']);
        });
    }
};
