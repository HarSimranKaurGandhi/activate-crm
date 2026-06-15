<?php

namespace App\Http\Controllers\Api\Masters;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Common\ReorderRequest;
use App\Http\Requests\Common\StatusRequest;
use App\Http\Requests\Masters\TermIndexRequest;
use App\Http\Requests\Masters\TermRequest;
use App\Http\Resources\TermResource;
use App\Services\TermService;
use Illuminate\Http\JsonResponse;

class TermController extends ApiController
{
    public function __construct(private TermService $terms)
    {
    }

    public function index(TermIndexRequest $request): JsonResponse
    {
        return $this->paginated(
            'Terms fetched successfully',
            $this->terms->paginate($request),
            TermResource::class
        );
    }

    public function store(TermRequest $request): JsonResponse
    {
        return $this->ok(
            'Term created successfully',
            new TermResource($this->terms->create($request->validated())),
            [],
            201
        );
    }

    public function show(int|string $id): JsonResponse
    {
        return $this->ok(
            'Term fetched successfully',
            new TermResource($this->terms->find($id))
        );
    }

    public function update(TermRequest $request, int|string $id): JsonResponse
    {
        $term = $this->terms->find($id);

        return $this->ok(
            'Term updated successfully',
            new TermResource($this->terms->update($term, $request->validated()))
        );
    }

    public function destroy(int|string $id): JsonResponse
    {
        $this->terms->delete($this->terms->find($id));

        return $this->ok('Term deleted successfully');
    }

    public function status(StatusRequest $request, int|string $id): JsonResponse
    {
        $term = $this->terms->find($id);

        return $this->ok(
            'Term status updated successfully',
            new TermResource($this->terms->toggleStatus($term, $request->boolean('is_active')))
        );
    }

    public function reorder(ReorderRequest $request): JsonResponse
    {
        $this->terms->reorder($request->validated('items'));

        return $this->ok('Terms reordered successfully');
    }

    public function active(TermIndexRequest $request): JsonResponse
    {
        return $this->ok(
            'Active terms fetched successfully',
            TermResource::collection($this->terms->active($request))
        );
    }
}
