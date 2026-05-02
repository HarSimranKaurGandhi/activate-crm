<?php

namespace App\Http\Controllers\Api\Masters;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Common\StatusRequest;
use App\Http\Requests\Masters\ProductIndexRequest;
use App\Http\Requests\Masters\ProductRequest;
use App\Http\Resources\ProductResource;
use App\Http\Resources\ProductSelectableResource;
use App\Services\ProductService;
use Illuminate\Http\JsonResponse;

class ProductController extends ApiController
{
    public function __construct(private ProductService $products)
    {
    }

    public function index(ProductIndexRequest $request): JsonResponse
    {
        return $this->paginated(
            'Products fetched successfully',
            $this->products->paginate($request),
            ProductResource::class
        );
    }

    public function store(ProductRequest $request): JsonResponse
    {
        return $this->ok(
            'Product created successfully',
            new ProductResource($this->products->create($request->validated())),
            [],
            201
        );
    }

    public function show(int|string $id): JsonResponse
    {
        return $this->ok(
            'Product fetched successfully',
            new ProductResource($this->products->find($id))
        );
    }

    public function update(ProductRequest $request, int|string $id): JsonResponse
    {
        $product = $this->products->find($id);

        return $this->ok(
            'Product updated successfully',
            new ProductResource($this->products->update($product, $request->validated()))
        );
    }

    public function status(StatusRequest $request, int|string $id): JsonResponse
    {
        $product = $this->products->find($id);

        return $this->ok(
            'Product status updated successfully',
            new ProductResource($this->products->toggleStatus($product, $request->boolean('is_active')))
        );
    }

    public function selectable(ProductIndexRequest $request): JsonResponse
    {
        return $this->paginated(
            'Selectable products fetched successfully',
            $this->products->selectable($request),
            ProductSelectableResource::class
        );
    }
}
