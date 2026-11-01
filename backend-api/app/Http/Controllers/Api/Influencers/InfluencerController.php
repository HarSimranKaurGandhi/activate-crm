<?php

namespace App\Http\Controllers\Api\Influencers;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Common\StatusRequest;
use App\Http\Requests\Influencers\InfluencerIndexRequest;
use App\Http\Requests\Influencers\InfluencerRequest;
use App\Http\Resources\InfluencerResource;
use App\Services\InfluencerService;
use Illuminate\Http\JsonResponse;

class InfluencerController extends ApiController
{
    public function __construct(private InfluencerService $influencers)
    {
    }

    public function index(InfluencerIndexRequest $request): JsonResponse
    {
        return $this->paginated(
            'Influencers fetched successfully',
            $this->influencers->paginate($request),
            InfluencerResource::class
        );
    }

    public function dropdown(InfluencerIndexRequest $request): JsonResponse
    {
        return $this->ok(
            'Influencers dropdown fetched successfully',
            InfluencerResource::collection($this->influencers->dropdown($request))
        );
    }

    public function store(InfluencerRequest $request): JsonResponse
    {
        return $this->ok(
            'Influencer created successfully',
            new InfluencerResource($this->influencers->create($request->validated())->load('assignedUser')),
            [],
            201
        );
    }

    public function show(int|string $id): JsonResponse
    {
        return $this->ok('Influencer fetched successfully', new InfluencerResource($this->influencers->find($id)));
    }

    public function update(InfluencerRequest $request, int|string $id): JsonResponse
    {
        return $this->ok(
            'Influencer updated successfully',
            new InfluencerResource($this->influencers->update($this->influencers->find($id), $request->validated())->load('assignedUser'))
        );
    }

    public function status(StatusRequest $request, int|string $id): JsonResponse
    {
        return $this->ok(
            'Influencer status updated successfully',
            new InfluencerResource($this->influencers->toggleStatus($this->influencers->find($id), $request->boolean('is_active'))->load('assignedUser'))
        );
    }
}
