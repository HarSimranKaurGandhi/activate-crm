<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\InventoryMovementRequest;
use App\Services\InventoryService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryController extends ApiController
{
    public function __construct(private InventoryService $inventory) {}
    public function index(Request $request): JsonResponse
    {
        $result = $this->inventory->overview($request);
        return $this->ok('Inventory fetched successfully', ['godowns' => $result['godowns'], 'products' => $result['products']->items()],
            ['pagination' => ApiResponse::paginationMeta($result['products'])]);
    }
    public function store(InventoryMovementRequest $request): JsonResponse
    {
        return $this->ok('Inventory movement saved successfully', $this->inventory->createMovement($request->validated(), $request, $request->user()), [], 201);
    }

    public function selectableProducts(Request $request): JsonResponse
    {
        $request->validate(['movement_type' => ['required', 'in:in,out'], 'search' => ['nullable', 'string', 'max:255']]);
        $paginator = $this->inventory->selectableProducts($request);
        return $this->ok('Inventory products fetched successfully', $paginator->items(), [
            'pagination' => ApiResponse::paginationMeta($paginator),
        ]);
    }

    public function productStock(int|string $id): JsonResponse
    {
        return $this->ok('Product stock fetched successfully', $this->inventory->productStock($id));
    }

    public function movements(Request $request): JsonResponse
    {
        $paginator = $this->inventory->movements($request);
        $rows = $paginator->getCollection()->map(fn ($movement) => [
            'id' => $movement->id,
            'movement_date' => optional($movement->movement_date)->format('Y-m-d'),
            'movement_type' => $movement->movement_type,
            'transport_type' => $movement->transport_type,
            'slip_url' => $movement->slip_path ? $request->getSchemeAndHttpHost().'/'.ltrim($movement->slip_path, '/') : null,
            'created_by' => $movement->creator ? ['id' => $movement->creator->id, 'name' => $movement->creator->name, 'email' => $movement->creator->email] : null,
            'total_packages' => $movement->items->sum('packages'),
            'items' => $movement->items->map(fn ($item) => [
                'id' => $item->id, 'product' => $item->product?->product_name,
                'model_number' => $item->product?->model_number, 'brand' => $item->product?->brand?->name,
                'godown' => $item->godown?->name, 'quantity' => (float) $item->quantity, 'packages' => (int) $item->packages,
            ])->values(),
        ])->values();
        return $this->ok('Inventory movements fetched successfully', $rows, ['pagination' => ApiResponse::paginationMeta($paginator)]);
    }
}
