<?php

namespace App\Http\Controllers\Api\Customers;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Common\StatusRequest;
use App\Http\Requests\Customers\CustomerIndexRequest;
use App\Http\Requests\Customers\CustomerRequest;
use App\Http\Resources\CustomerQuotationResource;
use App\Http\Resources\CustomerResource;
use App\Services\CustomerService;
use Illuminate\Http\JsonResponse;

class CustomerController extends ApiController
{
    public function __construct(private CustomerService $customers)
    {
    }

    public function index(CustomerIndexRequest $request): JsonResponse
    {
        return $this->paginated(
            'Customers fetched successfully',
            $this->customers->paginate($request),
            CustomerResource::class
        );
    }

    public function store(CustomerRequest $request): JsonResponse
    {
        return $this->ok(
            'Customer created successfully',
            new CustomerResource($this->customers->create($request->validated())),
            [],
            201
        );
    }

    public function show(int|string $id): JsonResponse
    {
        return $this->ok(
            'Customer fetched successfully',
            new CustomerResource($this->customers->find($id))
        );
    }

    public function update(CustomerRequest $request, int|string $id): JsonResponse
    {
        $customer = $this->customers->find($id);

        return $this->ok(
            'Customer updated successfully',
            new CustomerResource($this->customers->update($customer, $request->validated()))
        );
    }

    public function destroy(int|string $id): JsonResponse
    {
        $this->customers->delete($this->customers->find($id));

        return $this->ok('Customer deleted successfully');
    }

    public function status(StatusRequest $request, int|string $id): JsonResponse
    {
        $customer = $this->customers->find($id);

        return $this->ok(
            'Customer status updated successfully',
            new CustomerResource($this->customers->toggleStatus($customer, $request->boolean('is_active')))
        );
    }

    public function quotations(CustomerIndexRequest $request, int|string $id): JsonResponse
    {
        $customer = $this->customers->find($id);

        return $this->paginated(
            'Customer quotations fetched successfully',
            $this->customers->quotationHistory($customer, $request),
            CustomerQuotationResource::class
        );
    }
}
