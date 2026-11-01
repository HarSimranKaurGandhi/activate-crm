<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('influencers', function (Blueprint $table): void {
            $table->string('influencer_type', 50)->nullable()->after('name');
            $table->index('influencer_type');
        });
    }

    public function down(): void
    {
        Schema::table('influencers', function (Blueprint $table): void {
            $table->dropIndex(['influencer_type']);
            $table->dropColumn('influencer_type');
        });
    }
};
