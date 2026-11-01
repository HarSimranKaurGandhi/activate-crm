<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\Role;
return new class extends Migration {
    public function up(): void {
        Schema::table('influencers', function (Blueprint $table): void {
            $table->foreignId('user_id')->nullable()->unique()->constrained('users')->nullOnDelete();
        });
        Role::firstOrCreate(['code'=>'influencer'], ['name'=>'Influencer','description'=>'Own leads and quotations only']);
    }
    public function down(): void {
        Schema::table('influencers', fn (Blueprint $table) => $table->dropConstrainedForeignId('user_id'));
    }
};
