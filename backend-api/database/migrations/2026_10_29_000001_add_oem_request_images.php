<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up(): void { Schema::table('spare_part_requests', function(Blueprint $t) { $t->json('image_paths')->nullable(); $t->string('video_path')->nullable(); $t->date('estimated_completion_date')->nullable(); }); }
 public function down(): void { Schema::table('spare_part_requests', fn(Blueprint $t)=>$t->dropColumn(['image_paths','video_path','estimated_completion_date'])); }
};
