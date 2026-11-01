<?php

namespace App\Services;

use App\Models\Godown;
use App\Models\InventoryMovement;
use App\Models\InventoryStock;
use App\Models\Dispatch;
use App\Models\Product;
use App\Models\User;
use App\Models\CustomerOwnedProduct;
use App\Support\PublicAsset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Validation\ValidationException;

class InventoryService
{
    public function updateStyle(int $productId, ?string $currentStyle, ?string $newStyle): void
    {
        $currentStyle = $this->normalizeStyle($currentStyle);
        $newStyle = $this->normalizeStyle($newStyle);

        DB::transaction(function () use ($productId, $currentStyle, $newStyle): void {
            Product::query()->whereKey($productId)->lockForUpdate()->firstOrFail();
            $stocks = InventoryStock::query()->where('product_id', $productId)->lockForUpdate()->get();
            $source = $stocks->filter(fn ($stock) => $this->normalizeStyle($stock->style) === $currentStyle);
            if ($source->isEmpty()) {
                throw ValidationException::withMessages(['current_style' => ['This stock style no longer exists. Refresh inventory and try again.']]);
            }
            if ($currentStyle === $newStyle) return;

            $duplicate = InventoryStock::query()->where('product_id', $productId)
                ->where('style', $newStyle)->whereNotIn('id', $source->modelKeys())->exists();
            if ($duplicate) {
                throw ValidationException::withMessages(['style' => ['This product already has stock with that style. Choose a different style.']]);
            }
            $threshold = DB::table('inventory_thresholds')->where('product_id', $productId)->where('style', $currentStyle)->first();
            if ($threshold) {
                if (DB::table('inventory_thresholds')->where('product_id', $productId)->where('style', $newStyle)->where('id', '!=', $threshold->id)->exists()) {
                    throw ValidationException::withMessages(['style' => ['A threshold already exists for that style. Clear it before renaming.']]);
                }
                DB::table('inventory_thresholds')->where('id', $threshold->id)->update(['style' => $newStyle, 'updated_at' => now()]);
            }
            InventoryStock::query()->whereIn('id', $source->modelKeys())->update(['style' => $newStyle]);
        });
    }

    public function overview(Request $request): array
    {
        $categoryId = $request->filled('category_id') ? (int) $request->integer('category_id') : null;
        $brandId = $request->filled('brand_id') ? (int) $request->integer('brand_id') : null;
        $godownId = $request->filled('godown_id') ? (int) $request->integer('godown_id') : null;
        $godowns = Godown::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']);
        $displayGodowns = $godownId === null ? $godowns : $godowns->where('id', $godownId);
        $stockItems = InventoryStock::query()
            ->join('products', 'products.id', '=', 'inventory_stocks.product_id')
            ->join('brands', 'brands.id', '=', 'products.brand_id')
            ->where('products.is_active', true)
            ->where('brands.is_active', true)
            ->when($categoryId !== null, fn ($query) => $query->where('products.category_id', $categoryId))
            ->when($brandId !== null, fn ($query) => $query->where('products.brand_id', $brandId))
            ->when($godownId !== null, fn ($query) => $query->where('inventory_stocks.godown_id', $godownId))
            ->when($request->filled('search'), function ($query) use ($request): void {
                $search = $request->string('search')->toString();
                $query->where(fn ($q) => $q
                    ->where('products.product_name', 'like', "%{$search}%")
                    ->orWhere('products.model_number', 'like', "%{$search}%")
                    ->orWhere('inventory_stocks.style', 'like', "%{$search}%"));
            })
            ->select(['inventory_stocks.product_id', 'inventory_stocks.style', 'products.product_name'])
            ->selectRaw('SUM(inventory_stocks.quantity) as filtered_quantity')
            ->groupBy('inventory_stocks.product_id', 'inventory_stocks.style', 'products.product_name')
            ->havingRaw('SUM(inventory_stocks.quantity) > 0')
            ->orderBy('products.product_name')
            ->orderBy('inventory_stocks.style')
            ->paginate((int) $request->integer('per_page', 15));

        $productIds = $stockItems->getCollection()->pluck('product_id')->unique();
        $products = Product::query()
            ->with(['category:id,name', 'brand:id,name', 'measurementUnit'])
            ->whereKey($productIds)
            ->get()
            ->keyBy('id');
        $stocks = InventoryStock::query()
            ->whereIn('product_id', $productIds)
            ->when($godownId !== null, fn ($query) => $query->where('godown_id', $godownId))
            ->get()
            ->groupBy('product_id');

        $stockItems->setCollection($stockItems->getCollection()->map(function ($stockItem) use ($products, $stocks, $displayGodowns): array {
            /** @var Product $product */
            $product = $products->get($stockItem->product_id);
            $style = $this->normalizeStyle($stockItem->style);
            $styleStocks = $stocks->get($product->id, collect())
                ->filter(fn (InventoryStock $stock): bool => $this->normalizeStyle($stock->style) === $style);
            $quantities = $displayGodowns->mapWithKeys(fn ($godown) => [
                (string) $godown->id => (float) $styleStocks->where('godown_id', $godown->id)->sum('quantity'),
            ])->all();

            return ['id' => $product->id, 'stock_key' => $product->id.'::'.$style, 'style' => $style ?: null,
                'product_name' => $product->product_name, 'model_number' => $product->model_number,
                'measurement_unit' => $product->measurementUnit?->name ?: $product->unit,
                'category' => $product->category?->name, 'brand' => $product->brand?->name,
                'quantities' => $quantities, 'total_quantity' => array_sum($quantities)];
        }));

        return ['godowns' => $godowns, 'products' => $stockItems];
    }

    public function selectableProducts(Request $request): LengthAwarePaginator
    {
        $isOut = $request->string('movement_type')->toString() === 'out';
        $godowns = Godown::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']);
        $products = Product::query()
            ->with(['brand:id,name', 'measurementUnit'])
            ->where('is_active', true)
            ->whereHas('brand', fn ($brand) => $brand->where('is_active', true))
            ->when($request->filled('search'), function ($query) use ($request): void {
                $search = $request->string('search')->toString();
                $query->where(function ($q) use ($search): void {
                    $q->where('product_name', 'like', "%{$search}%")
                        ->orWhere('model_number', 'like', "%{$search}%")
                        ->orWhereHas('brand', fn ($brand) => $brand->where('name', 'like', "%{$search}%"))
                        ->orWhereExists(function ($stockQuery) use ($search): void {
                            $stockQuery->selectRaw('1')
                                ->from('inventory_stocks')
                                ->whereColumn('inventory_stocks.product_id', 'products.id')
                                ->where('inventory_stocks.style', 'like', "%{$search}%");
                        });
                });
            })
            ->when($isOut, fn ($query) => $query->whereExists(function ($stockQuery): void {
                $stockQuery->selectRaw('1')->from('inventory_stocks')
                    ->whereColumn('inventory_stocks.product_id', 'products.id')
                    ->groupBy('inventory_stocks.product_id')->havingRaw('SUM(inventory_stocks.quantity) > 0');
            }))
            ->orderBy('product_name')->paginate(50);
        $productCollection = $products->getCollection();
        $stocks = InventoryStock::query()->whereIn('product_id', $productCollection->pluck('id'))->get()->groupBy('product_id');

        $products->setCollection($productCollection->map(function (Product $product) use ($stocks, $godowns): array {
            $productStocks = $stocks->get($product->id, collect());
            $quantities = $godowns->map(fn ($godown) => [
                'godown_id' => $godown->id, 'godown' => $godown->name,
                'quantity' => (float) $productStocks->where('godown_id', $godown->id)->sum('quantity'),
            ])->values();
            return [
                'id' => $product->id, 'product_name' => $product->product_name, 'model_number' => $product->model_number,
                'brand' => $product->brand?->name, 'measurement_unit' => $product->measurementUnit?->name ?: $product->unit,
                'quantities' => $quantities, 'total_quantity' => $quantities->sum('quantity'),
                'stock_variants' => $this->stockVariants($productStocks, $godowns),
            ];
        })->values());

        return $products;
    }

    public function productStock(int|string $productId): array
    {
        $product = Product::query()->with(['brand:id,name', 'measurementUnit'])->findOrFail($productId);
        $godowns = Godown::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']);
        $stocks = InventoryStock::query()->where('product_id', $product->id)->get();
        $quantities = $godowns->map(fn ($godown) => [
            'godown_id' => $godown->id, 'godown' => $godown->name,
            'quantity' => (float) $stocks->where('godown_id', $godown->id)->sum('quantity'),
        ])->values();
        return ['id' => $product->id, 'product_name' => $product->product_name, 'model_number' => $product->model_number,
            'brand' => $product->brand?->name, 'measurement_unit' => $product->measurementUnit?->name ?: $product->unit,
            'quantities' => $quantities, 'total_quantity' => $quantities->sum('quantity'),
            'stock_variants' => $this->stockVariants($stocks, $godowns)];
    }

    public function movements(Request $request): LengthAwarePaginator
    {
        return InventoryMovement::query()
            ->with(['creator:id,name,email', 'items.product:id,product_name,model_number,brand_id', 'items.product.brand:id,name', 'items.godown:id,name'])
            ->latest('movement_date')->latest('id')
            ->paginate((int) $request->integer('per_page', 15));
    }

    public function createMovement(array $data, Request $request, ?User $user): InventoryMovement
    {
        return DB::transaction(function () use ($data, $request, $user): InventoryMovement {
            if (! empty($data['dispatch_id'])) {
                if ($data['movement_type'] !== 'out') {
                    throw ValidationException::withMessages(['dispatch_id' => ['A dispatch slip can only be linked to an OUT movement.']]);
                }
                $dispatch = Dispatch::query()->lockForUpdate()->findOrFail($data['dispatch_id']);
                if ($dispatch->status !== 'invoiced') {
                    throw ValidationException::withMessages(['dispatch_id' => ['Only an invoiced dispatch can be stocked out.']]);
                }
                $data['customer_id'] = $dispatch->customer_id;
            }
            $slipPath = $request->hasFile('slip') ? PublicAsset::store($request->file('slip'), 'uploads/inventory/slips') : null;
            $movement = InventoryMovement::create([
                'movement_date' => $data['movement_date'], 'movement_type' => $data['movement_type'],
                'transport_type' => $data['transport_type'], 'customer_id' => $data['customer_id'] ?? null,
                'dispatch_id' => $data['dispatch_id'] ?? null, 'slip_path' => $slipPath, 'created_by' => $user?->id,
            ]);
            foreach ($data['items'] as $index => $item) {
                $item['style'] = $this->normalizeStyle($item['style'] ?? '');
                $stock = InventoryStock::query()->lockForUpdate()->firstOrCreate(
                    [
                        'product_id' => $item['product_id'],
                        'godown_id' => $item['godown_id'],
                        'style' => $item['style'],
                    ],
                    ['quantity' => 0]
                );
                $quantity = (float) $item['quantity'];
                $next = (float) $stock->quantity + ($data['movement_type'] === 'in' ? $quantity : -$quantity);
                if ($next < 0) throw ValidationException::withMessages(["items.{$index}.quantity" => ['Insufficient stock in the selected godown.']]);
                $stock->update(['quantity' => $next]);
                $movement->items()->create($item);
            }
            if (! empty($data['dispatch_id']) && $data['movement_type'] === 'out') {
                Dispatch::query()->whereKey($data['dispatch_id'])->update(['status' => 'dispatched']);
                foreach ($movement->items as $item) {
                    $owned = CustomerOwnedProduct::query()->firstOrNew([
                        'customer_id' => $movement->customer_id,
                        'product_id' => $item->product_id,
                    ]);
                    $owned->quantity = (float) ($owned->quantity ?? 0) + (float) $item->quantity;
                    $owned->first_purchased_at ??= $movement->movement_date;
                    $owned->last_purchased_at = $movement->movement_date;
                    $owned->source_dispatch_id = $movement->dispatch_id;
                    $owned->created_by ??= $user?->id;
                    $owned->save();
                }
            }
            return $movement->load('items');
        });
    }

    private function stockVariants($stocks, $godowns): array
    {
        return $stocks
            ->groupBy(fn (InventoryStock $stock): string => $this->normalizeStyle($stock->style))
            ->map(function ($styleStocks, string $style) use ($godowns): array {
                $quantities = $godowns->map(fn ($godown) => [
                    'godown_id' => $godown->id,
                    'godown' => $godown->name,
                    'quantity' => (float) $styleStocks->where('godown_id', $godown->id)->sum('quantity'),
                ])->values();

                return [
                    'style' => $style,
                    'quantities' => $quantities,
                    'total_quantity' => (float) $quantities->sum('quantity'),
                ];
            })
            ->filter(fn (array $variant): bool => $variant['total_quantity'] > 0)
            ->sortBy(fn (array $variant): string => mb_strtolower($variant['style']))
            ->values()
            ->all();
    }

    private function normalizeStyle(mixed $style): string
    {
        return trim((string) preg_replace('/\s+/', ' ', (string) $style));
    }
}
