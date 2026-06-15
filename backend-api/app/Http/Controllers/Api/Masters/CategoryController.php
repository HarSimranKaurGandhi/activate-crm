<?php

namespace App\Http\Controllers\Api\Masters;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Common\StatusRequest;
use App\Http\Requests\Masters\CategoryIndexRequest;
use App\Http\Requests\Masters\CategoryRequest;
use App\Http\Resources\CategoryDropdownResource;
use App\Http\Resources\CategoryResource;
use App\Services\CategoryService;
use Illuminate\Http\JsonResponse;

class CategoryController extends ApiController
{
    public function __construct(private CategoryService $categories)
    {
    }

    public function index(CategoryIndexRequest $request): JsonResponse
    {
        return $this->paginated(
            'Categories fetched successfully',
            $this->categories->paginate($request),
            CategoryResource::class
        );
    }

    public function store(CategoryRequest $request): JsonResponse
    {
        return $this->ok(
            'Category created successfully',
            new CategoryResource($this->categories->create($request->validated())),
            [],
            201
        );
    }

    public function show(int|string $id): JsonResponse
    {
        return $this->ok(
            'Category fetched successfully',
            new CategoryResource($this->categories->find($id))
        );
    }

    public function update(CategoryRequest $request, int|string $id): JsonResponse
    {
        $category = $this->categories->find($id);

        return $this->ok(
            'Category updated successfully',
            new CategoryResource($this->categories->update($category, $request->validated()))
        );
    }

    public function destroy(int|string $id): JsonResponse
    {
        $this->categories->delete($this->categories->find($id));

        return $this->ok('Category deleted successfully');
    }

    public function status(StatusRequest $request, int|string $id): JsonResponse
    {
        $category = $this->categories->find($id);

        return $this->ok(
            'Category status updated successfully',
            new CategoryResource($this->categories->toggleStatus($category, $request->boolean('is_active')))
        );
    }

    public function dropdown(CategoryIndexRequest $request): JsonResponse
    {
        return $this->ok(
            'Categories dropdown fetched successfully',
            CategoryDropdownResource::collection($this->categories->dropdown($request))
        );
    }
}
