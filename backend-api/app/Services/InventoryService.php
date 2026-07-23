<?php

namespace App\Services;

use App\Models\Godown;
use App\Models\InventoryMovement;
use App\Models\InventoryStock;
use App\Models\Dispatch;
use App\Models\Product;
use App\Models\User;
use App\Support\PublicAsset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Validation\ValidationException;

class InventoryService
{
    public function overview(Request $request): array
    {
        $godowns = Godown::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']);
        $products = Product::query()->with(['brand:id,name', 'measurementUnit'])->where('is_active', true)
            ->whereExists(function ($query): void {
                $query->selectRaw('1')->from('inventory_stocks')
                    ->whereColumn('inventory_stocks.product_id', 'products.id')
                    ->groupBy('inventory_stocks.product_id')
                    ->havingRaw('SUM(inventory_stocks.quantity) > 0');
            })
            ->when($request->filled('search'), function ($query) use ($request): void {
                $search = $request->string('search')->toString();
                $query->where(fn ($q) => $q->where('product_name', 'like', "%{$search}%")->orWhere('model_number', 'like', "%{$search}%"));
            })->orderBy('product_name')->paginate((int) $request->integer('per_page', 15));
        $stocks = InventoryStock::query()->whereIn('product_id', $products->getCollection()->pluck('id'))->get()->groupBy('product_id');

        $products->setCollection($products->getCollection()->map(function (Product $product) use ($stocks, $godowns): array {
            $byGodown = $stocks->get($product->id, collect())->keyBy('godown_id');
            $quantities = $godowns->mapWithKeys(fn ($godown) => [(string) $godown->id => (float) ($byGodown->get($godown->id)?->quantity ?? 0)])->all();
            return ['id' => $product->id, 'product_name' => $product->product_name, 'model_number' => $product->model_number,
                'measurement_unit' => $product->measurementUnit?->name ?: $product->unit,
                'brand' => $product->brand?->name, 'quantities' => $quantities, 'total_quantity' => array_sum($quantities)];
        }));

        return ['godowns' => $godowns, 'products' => $products];
    }

    public function selectableProducts(Request $request): LengthAwarePaginator
    {
        $isOut = $request->string('movement_type')->toString() === 'out';
        $godowns = Godown::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']);
        $products = Product::query()->with(['brand:id,name', 'measurementUnit'])->where('is_active', true)
            ->when($request->filled('search'), function ($query) use ($request): void {
                $search = $request->string('search')->toString();
                $query->where(function ($q) use ($search): void {
                    $q->where('product_name', 'like', "%{$search}%")
                        ->orWhere('model_number', 'like', "%{$search}%")
                        ->orWhereHas('brand', fn ($brand) => $brand->where('name', 'like', "%{$search}%"));
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
            $byGodown = $stocks->get($product->id, collect())->keyBy('godown_id');
            $quantities = $godowns->map(fn ($godown) => [
                'godown_id' => $godown->id, 'godown' => $godown->name,
                'quantity' => (float) ($byGodown->get($godown->id)?->quantity ?? 0),
            ])->values();
            return [
                'id' => $product->id, 'product_name' => $product->product_name, 'model_number' => $product->model_number,
                'brand' => $product->brand?->name, 'measurement_unit' => $product->measurementUnit?->name ?: $product->unit,
                'quantities' => $quantities, 'total_quantity' => $quantities->sum('quantity'),
            ];
        })->values());

        return $products;
    }

    public function productStock(int|string $productId): array
    {
        $product = Product::query()->with(['brand:id,name', 'measurementUnit'])->findOrFail($productId);
        $godowns = Godown::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']);
        $stocks = InventoryStock::query()->where('product_id', $product->id)->get()->keyBy('godown_id');
        $quantities = $godowns->map(fn ($godown) => [
            'godown_id' => $godown->id, 'godown' => $godown->name,
            'quantity' => (float) ($stocks->get($godown->id)?->quantity ?? 0),
        ])->values();
        return ['id' => $product->id, 'product_name' => $product->product_name, 'model_number' => $product->model_number,
            'brand' => $product->brand?->name, 'measurement_unit' => $product->measurementUnit?->name ?: $product->unit,
            'quantities' => $quantities, 'total_quantity' => $quantities->sum('quantity')];
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
                $stock = InventoryStock::query()->lockForUpdate()->firstOrCreate(
                    ['product_id' => $item['product_id'], 'godown_id' => $item['godown_id']], ['quantity' => 0]
                );
                $quantity = (float) $item['quantity'];
                $next = (float) $stock->quantity + ($data['movement_type'] === 'in' ? $quantity : -$quantity);
                if ($next < 0) throw ValidationException::withMessages(["items.{$index}.quantity" => ['Insufficient stock in the selected godown.']]);
                $stock->update(['quantity' => $next]);
                $movement->items()->create($item);
            }
            if (! empty($data['dispatch_id']) && $data['movement_type'] === 'out') {
                Dispatch::query()->whereKey($data['dispatch_id'])->update(['status' => 'dispatched']);
            }
            return $movement->load('items');
        });
    }
}
