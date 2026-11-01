<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_sequences', function (Blueprint $table): void {
            $table->string('financial_year', 7)->primary();
            $table->unsignedInteger('last_number')->default(0);
        });
        Schema::create('tax_invoices', function (Blueprint $table): void {
            $table->id();
            $table->string('invoice_number', 16)->unique();
            $table->foreignId('dispatch_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('customer_id')->constrained()->restrictOnDelete();
            $table->date('invoice_date');
            $table->date('due_date')->nullable();
            $table->string('tax_mode', 20);
            $table->string('place_of_supply');
            $table->json('snapshot');
            $table->decimal('taxable_total', 16, 2);
            $table->decimal('tax_total', 16, 2);
            $table->decimal('grand_total', 16, 2);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index('invoice_date');
        });
        DB::table('user_module_permissions')->where('module', 'dispatches')->orderBy('id')->chunkById(200, function ($permissions): void {
            DB::table('user_module_permissions')->insertOrIgnore($permissions->map(fn ($permission) => [
                'user_id' => $permission->user_id, 'module' => 'billing',
                'can_view' => $permission->can_view, 'can_edit' => $permission->can_edit,
                'created_at' => now(), 'updated_at' => now(),
            ])->all());
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tax_invoices');
        Schema::dropIfExists('invoice_sequences');
        DB::table('user_module_permissions')->where('module', 'billing')->delete();
    }
};
