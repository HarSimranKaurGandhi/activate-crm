<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventoryThresholdService
{
    private function combinations()
    {
        // Group across godowns, including zero stock. No stock means one unstyled row.
        $stock = DB::table('inventory_stocks')->select('product_id', 'style')
            ->selectRaw('SUM(quantity) as stock_quantity')->groupBy('product_id', 'style');

        return DB::table('products')->leftJoinSub($stock, 'stock', 'stock.product_id', '=', 'products.id')
            ->where('products.is_active', true);
    }

    public function listing(Request $request)
    {
        return $this->combinations()
            ->leftJoin('inventory_thresholds as thresholds', function ($join): void {
                $join->on('thresholds.product_id', '=', 'products.id')
                    ->whereRaw("thresholds.style = COALESCE(stock.style, '')");
            })
            ->when($request->filled('search'), function ($query) use ($request): void {
                $search = '%'.trim($request->string('search')->toString()).'%';
                $query->where(fn ($q) => $q->where('products.product_name', 'like', $search)
                    ->orWhere('products.model_number', 'like', $search)->orWhere('stock.style', 'like', $search));
            })
            ->select(['products.id as product_id', 'products.product_name', 'products.model_number', 'products.unit', 'thresholds.quantity as threshold_quantity'])
            ->selectRaw("COALESCE(stock.style, '') as style, COALESCE(stock.stock_quantity, 0) as stock_quantity")
            ->orderBy('products.product_name')->orderBy('products.id')->orderBy('stock.style')
            ->paginate($request->integer('per_page', 15));
    }

    public function save(int $productId, string $style, mixed $quantity): void
    {
        DB::transaction(function () use ($productId, $style, $quantity): void {
            Product::query()->whereKey($productId)->where('is_active', true)->lockForUpdate()->firstOrFail();
            $exists = $this->combinations()->where('products.id', $productId)
                ->whereRaw("COALESCE(stock.style, '') = ?", [$style])->exists();
            if (!$exists) {
                throw ValidationException::withMessages(['style' => ['This item/style combination no longer exists. Refresh the page.']]);
            }
            $key = ['product_id' => $productId, 'style' => $style];
            if ($quantity === null) {
                DB::table('inventory_thresholds')->where($key)->delete();
                return;
            }
            DB::table('inventory_thresholds')->upsert([
                [...$key, 'quantity' => $quantity, 'created_at' => now(), 'updated_at' => now()],
            ], ['product_id', 'style'], ['quantity', 'updated_at']);
        });
    }
}
