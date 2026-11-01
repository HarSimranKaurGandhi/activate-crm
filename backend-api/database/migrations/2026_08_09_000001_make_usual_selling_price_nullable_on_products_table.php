<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            $table->decimal('usual_selling_price', 15, 2)->nullable()->change();
        });
    }

    public function down(): void
    {
        DB::table('products')->whereNull('usual_selling_price')->update(['usual_selling_price' => 0]);

        Schema::table('products', function (Blueprint $table): void {
            $table->decimal('usual_selling_price', 15, 2)->nullable(false)->change();
        });
    }
};
