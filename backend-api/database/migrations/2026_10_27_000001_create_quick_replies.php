<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\{Schema, DB};
return new class extends Migration {
    public function up(): void {
        Schema::create('quick_replies', function (Blueprint $table) {
            $table->id(); $table->string('name')->unique(); $table->timestamps();
        });
        foreach (['Followed up on WhatsApp', 'Called and discussed again', 'Almost final'] as $name) {
            DB::table('quick_replies')->insert(['name'=>$name, 'created_at'=>now(), 'updated_at'=>now()]);
        }
    }
    public function down(): void { Schema::dropIfExists('quick_replies'); }
};
