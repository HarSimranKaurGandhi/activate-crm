<?php

namespace App\Http\Controllers\Api\Logs;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Logs\ActivityLogIndexRequest;
use App\Http\Resources\ActivityLogResource;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;

class ActivityLogController extends ApiController
{
    public function __construct(private ActivityLogService $activityLogs)
    {
    }

    public function index(ActivityLogIndexRequest $request): JsonResponse
    {
        return $this->paginated(
            'Activity logs fetched successfully',
            $this->activityLogs->paginate($request),
            ActivityLogResource::class,
        );
    }
}
