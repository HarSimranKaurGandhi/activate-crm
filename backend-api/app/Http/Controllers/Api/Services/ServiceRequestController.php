<?php

namespace App\Http\Controllers\Api\Services;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Services\ServiceRequestRequest;
use App\Http\Resources\ServiceRequestResource;
use App\Services\ServiceRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceRequestController extends ApiController
{
    public function __construct(private ServiceRequestService $services) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate(['status' => ['nullable', 'in:scheduled,in_progress,completed,cancelled'], 'scope' => ['nullable', 'in:mine,all'], 'include_closed' => ['nullable', 'boolean'], 'search' => ['nullable', 'string', 'max:255'], 'per_page' => ['nullable', 'integer', 'min:1', 'max:100']]);
        return $this->paginated('Scheduled services fetched successfully', $this->services->paginate($request), ServiceRequestResource::class);
    }

    public function store(ServiceRequestRequest $request): JsonResponse
    {
        return $this->ok('Service scheduled successfully', new ServiceRequestResource($this->services->create($request->validated(), $request->user())), [], 201);
    }

    public function show(int|string $id): JsonResponse
    {
        return $this->ok('Service request fetched successfully', new ServiceRequestResource($this->services->find($id)));
    }

    public function update(ServiceRequestRequest $request, int|string $id): JsonResponse
    {
        return $this->ok('Service request updated successfully', new ServiceRequestResource($this->services->update($this->services->find($id), $request->validated(), $request->user(), $request->ip())));
    }

    public function activity(int|string $id): JsonResponse
    {
        $service = $this->services->find($id);
        return $this->ok('Service request timeline fetched successfully', $this->services->activity($service));
    }

    public function comment(Request $request, int|string $id): JsonResponse
    {
        $data = $request->validate(['comment' => ['required', 'string', 'max:5000']]);

        return $this->ok('Service comment added successfully', $this->services->addComment($this->services->find($id), $data['comment'], $request->user(), $request->ip()), [], 201);
    }
}
