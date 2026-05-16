<?php

namespace App\Http\Controllers\Api\Masters;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Common\StatusRequest;
use App\Http\Requests\Masters\ProductBulkUploadRequest;
use App\Http\Requests\Masters\ProductIndexRequest;
use App\Http\Requests\Masters\ProductRequest;
use App\Http\Resources\ProductResource;
use App\Http\Resources\ProductSelectableResource;
use App\Services\ProductService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

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

    public function bulkUpload(ProductBulkUploadRequest $request): JsonResponse
    {
        $result = $this->products->bulkUpsertFromCsv($request->file('file')->getRealPath());

        return $this->ok('Products imported successfully', $result);
    }

    public function bulkSample(): StreamedResponse
    {
        $content = $this->products->sampleCsv();

        return response()->streamDownload(function () use ($content): void {
            echo $content;
        }, 'product_bulk_upload_sample.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }
}
