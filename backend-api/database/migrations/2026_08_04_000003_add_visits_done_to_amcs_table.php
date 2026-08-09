<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void { Schema::table('amcs',fn(Blueprint $table)=>$table->unsignedTinyInteger('visits_done')->default(0)->after('yearly_visits')); }
    public function down(): void { Schema::table('amcs',fn(Blueprint $table)=>$table->dropColumn('visits_done')); }
};
