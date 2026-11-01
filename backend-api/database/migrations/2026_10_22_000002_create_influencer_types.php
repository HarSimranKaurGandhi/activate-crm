<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('influencer_types', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name', 100)->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        $types = ['architect'=>'Architect', 'trainer'=>'Trainer', 'govt_employee'=>'Govt Employee', 'oem'=>'OEM', 'misc'=>'Misc', 'technician'=>'Technician'];
        foreach (DB::table('influencers')->whereNotNull('influencer_type')->distinct()->pluck('influencer_type') as $code) {
            if ($code !== '') $types[$code] ??= Str::headline($code);
        }
        foreach ($types as $code => $name) {
            if (DB::table('influencer_types')->where('name', $name)->exists()) $name = $code;
            DB::table('influencer_types')->insert(['code'=>$code, 'name'=>$name, 'is_active'=>true, 'created_at'=>now(), 'updated_at'=>now()]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('influencer_types');
    }
};
