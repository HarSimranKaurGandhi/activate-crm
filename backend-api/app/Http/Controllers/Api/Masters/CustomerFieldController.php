<?php

namespace App\Http\Controllers\Api\Masters;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Common\ReorderRequest;
use App\Http\Requests\Common\StatusRequest;
use App\Http\Requests\Masters\CustomerFieldIndexRequest;
use App\Http\Requests\Masters\CustomerFieldRequest;
use App\Http\Resources\CustomerFieldResource;
use App\Services\CustomerFieldService;
use Illuminate\Http\JsonResponse;

class CustomerFieldController extends ApiController
{
    public function __construct(private CustomerFieldService $customerFields)
    {
    }

    public function index(CustomerFieldIndexRequest $request): JsonResponse
    {
        return $this->paginated(
            'Customer fields fetched successfully',
            $this->customerFields->paginate($request),
            CustomerFieldResource::class
        );
    }

    public function store(CustomerFieldRequest $request): JsonResponse
    {
        return $this->ok(
            'Customer field created successfully',
            new CustomerFieldResource($this->customerFields->create($request->validated())),
            [],
            201
        );
    }

    public function show(int|string $id): JsonResponse
    {
        return $this->ok(
            'Customer field fetched successfully',
            new CustomerFieldResource($this->customerFields->find($id))
        );
    }

    public function update(CustomerFieldRequest $request, int|string $id): JsonResponse
    {
        $field = $this->customerFields->find($id);

        return $this->ok(
            'Customer field updated successfully',
            new CustomerFieldResource($this->customerFields->update($field, $request->validated()))
        );
    }

    public function destroy(int|string $id): JsonResponse
    {
        $this->customerFields->find($id)->delete();

        return $this->ok('Customer field deleted successfully');
    }

    public function status(StatusRequest $request, int|string $id): JsonResponse
    {
        $field = $this->customerFields->find($id);

        return $this->ok(
            'Customer field status updated successfully',
            new CustomerFieldResource($this->customerFields->toggleStatus($field, $request->boolean('is_active')))
        );
    }

    public function reorder(ReorderRequest $request): JsonResponse
    {
        $this->customerFields->reorder($request->validated('items'));

        return $this->ok('Customer fields reordered successfully');
    }
}
