<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dispatch_help_book_entries', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->text('value');
            $table->timestamps();

            $table->index('name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dispatch_help_book_entries');
    }
};
