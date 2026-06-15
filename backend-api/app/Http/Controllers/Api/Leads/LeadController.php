<?php

namespace App\Http\Controllers\Api\Leads;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Leads\LeadIndexRequest;
use App\Http\Requests\Leads\LeadRequest;
use App\Http\Resources\LeadResource;
use App\Services\LeadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

class LeadController extends ApiController
{
    public function __construct(private LeadService $leads)
    {
    }

    public function index(LeadIndexRequest $request): JsonResponse
    {
        return $this->paginated(
            'Leads fetched successfully',
            $this->leads->paginate($request),
            LeadResource::class
        );
    }

    public function store(LeadRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['created_by'] = $request->user()?->id;
        $data['follow_up_date'] = $data['follow_up_date'] ?? Carbon::today()->addDays(2)->format('Y-m-d');

        return $this->ok(
            'Lead created successfully',
            new LeadResource($this->leads->create($data)),
            [],
            201
        );
    }

    public function show(int|string $id): JsonResponse
    {
        return $this->ok(
            'Lead fetched successfully',
            new LeadResource($this->leads->find($id))
        );
    }

    public function update(LeadRequest $request, int|string $id): JsonResponse
    {
        $lead = $this->leads->find($id);
        $data = $request->validated();
        unset($data['created_by']);

        return $this->ok(
            'Lead updated successfully',
            new LeadResource($this->leads->update($lead, $data))
        );
    }

    public function destroy(int|string $id): JsonResponse
    {
        $this->leads->delete($this->leads->find($id));

        return $this->ok('Lead deleted successfully');
    }
}
