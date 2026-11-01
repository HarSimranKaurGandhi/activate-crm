<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('inventory_movement_items', 'style')) {
            Schema::table('inventory_movement_items', function (Blueprint $table): void {
                $table->string('style', 100)->default('')->after('product_id');
            });
        }

        // The original unique index may also support the product foreign key in
        // MySQL. Add a dedicated index before replacing it so the FK stays valid.
        if (! $this->hasIndex('inventory_stocks', 'inventory_stocks_product_id_index')) {
            Schema::table('inventory_stocks', function (Blueprint $table): void {
                $table->index('product_id', 'inventory_stocks_product_id_index');
            });
        }

        if (! Schema::hasColumn('inventory_stocks', 'style')) {
            Schema::table('inventory_stocks', function (Blueprint $table): void {
                $table->string('style', 100)->default('')->after('product_id');
            });
        }

        if ($this->hasIndex('inventory_stocks', 'inventory_stocks_product_id_godown_id_unique')) {
            Schema::table('inventory_stocks', function (Blueprint $table): void {
                $table->dropUnique('inventory_stocks_product_id_godown_id_unique');
            });
        }

        if (! $this->hasIndex('inventory_stocks', 'inventory_stocks_product_godown_style_unique')) {
            Schema::table('inventory_stocks', function (Blueprint $table): void {
                $table->unique(['product_id', 'godown_id', 'style'], 'inventory_stocks_product_godown_style_unique');
            });
        }
    }

    public function down(): void
    {
        DB::table('inventory_stocks')
            ->selectRaw('MIN(id) as keep_id, product_id, godown_id, SUM(quantity) as total_quantity')
            ->groupBy('product_id', 'godown_id')
            ->havingRaw('COUNT(*) > 1')
            ->get()
            ->each(function (object $group): void {
                DB::table('inventory_stocks')->where('id', $group->keep_id)->update([
                    'quantity' => $group->total_quantity,
                ]);
                DB::table('inventory_stocks')
                    ->where('product_id', $group->product_id)
                    ->where('godown_id', $group->godown_id)
                    ->where('id', '!=', $group->keep_id)
                    ->delete();
            });

        if ($this->hasIndex('inventory_stocks', 'inventory_stocks_product_godown_style_unique')) {
            Schema::table('inventory_stocks', function (Blueprint $table): void {
                $table->dropUnique('inventory_stocks_product_godown_style_unique');
            });
        }

        if (Schema::hasColumn('inventory_stocks', 'style')) {
            Schema::table('inventory_stocks', function (Blueprint $table): void {
                $table->dropColumn('style');
            });
        }

        if (! $this->hasIndex('inventory_stocks', 'inventory_stocks_product_id_godown_id_unique')) {
            Schema::table('inventory_stocks', function (Blueprint $table): void {
                $table->unique(['product_id', 'godown_id']);
            });
        }

        if ($this->hasIndex('inventory_stocks', 'inventory_stocks_product_id_index')) {
            Schema::table('inventory_stocks', function (Blueprint $table): void {
                $table->dropIndex('inventory_stocks_product_id_index');
            });
        }

        if (Schema::hasColumn('inventory_movement_items', 'style')) {
            Schema::table('inventory_movement_items', function (Blueprint $table): void {
                $table->dropColumn('style');
            });
        }
    }

    private function hasIndex(string $table, string $index): bool
    {
        return in_array($index, Schema::getIndexListing($table), true);
    }
};
