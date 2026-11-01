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
use Illuminate\Http\Request;

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

    public function overview(Request $request, int|string $id): JsonResponse
    {
        $customer = $this->customers->find($id);

        return $this->ok('Customer overview fetched successfully', [
            'customer' => (new CustomerResource($customer))->resolve($request),
            ...$this->customers->overview($customer, $request->user()),
        ]);
    }

    public function generateRequirement(Request $request, int|string $id): JsonResponse
    {
        $data = $request->validate([
            'requirement' => ['required', 'string', 'max:10000', 'regex:/\\S/'],
            'assigned_to' => ['required', 'integer', \Illuminate\Validation\Rule::exists('users', 'id')->where('is_active', true)],
        ]);
        $lead = app(\App\Services\LeadService::class)->generateCustomerRequirement(
            $this->customers->find($id), $data, $request->user(), $request->ip()
        );

        return $this->ok('Requirement generated successfully', new \App\Http\Resources\LeadResource($lead));
    }

    public function addOwnedProduct(Request $request, int|string $id): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => ['nullable', 'integer', 'exists:products,id', 'required_without:product_description'],
            'product_description' => ['nullable', 'string', 'max:2000', 'required_without:product_id'],
            'quantity' => ['required', 'numeric', 'gt:0'],
            'purchase_date' => ['required', 'date', 'before_or_equal:today'],
            'serial_number' => ['nullable','string','max:100'],
            'reference_image' => ['nullable','image','mimes:jpg,jpeg,png,webp','extensions:jpg,jpeg,png,webp','max:5120'],
        ]);

        $customer=$this->customers->find($id);
        $path=null;
        unset($validated['reference_image']);
        try {
            if ($request->hasFile('reference_image')) $validated['reference_image_path']=$path=\App\Support\PublicAsset::store($request->file('reference_image'),'uploads/customer-product-references');
            $this->customers->addOwnedProduct($customer, $validated, $request->user());
        } catch (\Throwable $error) {
            if ($path) \App\Support\PublicAsset::delete($path);
            throw $error;
        }

        return $this->ok('Customer product added successfully');
    }

    public function removeOwnedProduct(int|string $id, int|string $ownedProductId): JsonResponse
    {
        $this->customers->removeOwnedProduct($this->customers->find($id), $ownedProductId);

        return $this->ok('Customer product removed successfully');
    }
}
