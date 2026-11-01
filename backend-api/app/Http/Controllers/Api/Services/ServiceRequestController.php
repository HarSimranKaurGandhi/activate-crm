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
        $request->validate([
            'status' => ['nullable', 'in:scheduled,in_progress,completed,cancelled'],
            'scope' => ['nullable', 'in:mine,all'],
            'include_closed' => ['nullable', 'boolean'],
            'open_only' => ['nullable', 'boolean'],
            'search' => ['nullable', 'string', 'max:255'],
            'date_filter' => ['nullable', 'in:all,today,this_week,this_month,custom,range'],
            'date_from' => ['nullable', 'required_if:date_filter,range', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'required_if:date_filter,range', 'date_format:Y-m-d', 'after_or_equal:date_from'],
            'custom_date' => ['nullable', 'required_if:date_filter,custom', 'date_format:Y-m-d'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        return $this->paginated('Scheduled services fetched successfully', $this->services->paginate($request), ServiceRequestResource::class);
    }

    public function reschedule(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'scheduled_date' => ['required', 'date_format:Y-m-d'],
            'previous_date' => ['present', 'nullable', 'date_format:Y-m-d'],
        ]);
        return $this->ok('Service rescheduled successfully', new ServiceRequestResource(
            $this->services->reschedule($id, $data, $request->user(), $request->ip())
        ));
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

    public function payments(Request $request): JsonResponse
    {
        $request->validate(['month' => ['sometimes', 'nullable', 'date_format:Y-m'], 'submission' => ['sometimes', 'in:all,pending'], 'scope' => ['sometimes', 'in:mine,all'], 'page' => ['sometimes', 'integer', 'min:1'], 'per_page' => ['sometimes', 'integer', 'min:1', 'max:100']]);
        $result = $this->services->payments($request);
        return $this->ok('Service payments fetched successfully', [
            'revenue' => $result['revenue'], 'collection' => $result['collection'],
            'entries' => ServiceRequestResource::collection($result['entries']->getCollection()),
        ], ['pagination' => \App\Support\ApiResponse::paginationMeta($result['entries'])]);
    }

    public function submitPayment(Request $request, int $id): JsonResponse
    {
        return $this->ok('Payment submitted successfully', new ServiceRequestResource($this->services->submitPayment($id, $request->user(), $request->ip())));
    }

    public function destroy(int|string $id): JsonResponse
    {
        $this->services->delete($this->services->find($id));

        return $this->ok('Service request deleted successfully');
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
