<?php

namespace App\Http\Controllers\Api\Masters;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Common\ReorderRequest;
use App\Http\Requests\Common\StatusRequest;
use App\Http\Requests\Masters\AdjustmentIndexRequest;
use App\Http\Requests\Masters\AdjustmentRequest;
use App\Http\Resources\AdjustmentResource;
use App\Services\AdjustmentService;
use Illuminate\Http\JsonResponse;

class AdjustmentController extends ApiController
{
    public function __construct(private AdjustmentService $adjustments)
    {
    }

    public function index(AdjustmentIndexRequest $request): JsonResponse
    {
        return $this->paginated(
            'Adjustments fetched successfully',
            $this->adjustments->paginate($request),
            AdjustmentResource::class
        );
    }

    public function store(AdjustmentRequest $request): JsonResponse
    {
        return $this->ok(
            'Adjustment created successfully',
            new AdjustmentResource($this->adjustments->create($request->validated())),
            [],
            201
        );
    }

    public function show(int|string $id): JsonResponse
    {
        return $this->ok(
            'Adjustment fetched successfully',
            new AdjustmentResource($this->adjustments->find($id))
        );
    }

    public function update(AdjustmentRequest $request, int|string $id): JsonResponse
    {
        $adjustment = $this->adjustments->find($id);

        return $this->ok(
            'Adjustment updated successfully',
            new AdjustmentResource($this->adjustments->update($adjustment, $request->validated()))
        );
    }

    public function status(StatusRequest $request, int|string $id): JsonResponse
    {
        $adjustment = $this->adjustments->find($id);

        return $this->ok(
            'Adjustment status updated successfully',
            new AdjustmentResource($this->adjustments->toggleStatus($adjustment, $request->boolean('is_active')))
        );
    }

    public function reorder(ReorderRequest $request): JsonResponse
    {
        $this->adjustments->reorder($request->validated('items'));

        return $this->ok('Adjustments reordered successfully');
    }

    public function active(AdjustmentIndexRequest $request): JsonResponse
    {
        return $this->ok(
            'Active adjustments fetched successfully',
            AdjustmentResource::collection($this->adjustments->active($request))
        );
    }
}
