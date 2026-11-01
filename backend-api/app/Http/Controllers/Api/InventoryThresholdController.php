<?php

namespace App\Http\Controllers\Api;

use App\Services\InventoryThresholdService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class InventoryThresholdController extends ApiController
{
    public function __construct(private InventoryThresholdService $thresholds) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate(['search' => ['nullable', 'string', 'max:255'], 'page' => ['sometimes', 'integer', 'min:1'], 'per_page' => ['sometimes', 'integer', 'min:1', 'max:100']]);
        $rows = $this->thresholds->listing($request);
        return $this->ok('Inventory thresholds fetched successfully', $rows->items(), ['pagination' => ApiResponse::paginationMeta($rows)]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'style' => ['present', 'nullable', 'string', 'max:100'],
            'quantity' => ['present', 'nullable', 'numeric', 'min:0', 'max:99999999999.999', 'decimal:0,3'],
        ]);
        $this->thresholds->save($id, $data['style'] ?? '', $data['quantity']);
        return $this->ok('Inventory threshold saved successfully');
    }
}
