<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leads', function (Blueprint $table): void {
            $table->id();
            $table->string('lead_source', 50);
            $table->string('name');
            $table->string('phone', 30);
            $table->string('email')->nullable();
            $table->string('address_line_1')->nullable();
            $table->string('address_line_2')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('state', 100)->nullable();
            $table->string('pincode', 20)->nullable();
            $table->string('country', 100)->nullable();
            $table->longText('requirement')->nullable();
            $table->string('status', 50)->default('new');
            $table->json('tags')->nullable();
            $table->date('follow_up_date')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['lead_source', 'status']);
            $table->index('follow_up_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};
