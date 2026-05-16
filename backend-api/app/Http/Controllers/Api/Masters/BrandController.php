<?php

namespace App\Http\Controllers\Api\Masters;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Common\StatusRequest;
use App\Http\Requests\Masters\BrandIndexRequest;
use App\Http\Requests\Masters\BrandRequest;
use App\Http\Resources\BrandDropdownResource;
use App\Http\Resources\BrandResource;
use App\Services\BrandService;
use Illuminate\Http\JsonResponse;

class BrandController extends ApiController
{
    public function __construct(private BrandService $brands)
    {
    }

    public function index(BrandIndexRequest $request): JsonResponse
    {
        return $this->paginated(
            'Brands fetched successfully',
            $this->brands->paginate($request),
            BrandResource::class
        );
    }

    public function store(BrandRequest $request): JsonResponse
    {
        return $this->ok(
            'Brand created successfully',
            new BrandResource($this->brands->create($request->all())),
            [],
            201
        );
    }

    public function show(int|string $id): JsonResponse
    {
        return $this->ok(
            'Brand fetched successfully',
            new BrandResource($this->brands->find($id))
        );
    }

    public function update(BrandRequest $request, int|string $id): JsonResponse
    {
        $brand = $this->brands->find($id);

        return $this->ok(
            'Brand updated successfully',
            new BrandResource($this->brands->update($brand, $request->all()))
        );
    }

    public function status(StatusRequest $request, int|string $id): JsonResponse
    {
        $brand = $this->brands->find($id);

        return $this->ok(
            'Brand status updated successfully',
            new BrandResource($this->brands->toggleStatus($brand, $request->boolean('is_active')))
        );
    }

    public function dropdown(BrandIndexRequest $request): JsonResponse
    {
        return $this->ok(
            'Brands dropdown fetched successfully',
            BrandDropdownResource::collection($this->brands->dropdown($request))
        );
    }
}
