<?php

namespace App\Http\Controllers\Api\Masters;

use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\MeasurementUnitResource;
use App\Services\MeasurementUnitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MeasurementUnitController extends ApiController
{
    public function __construct(private MeasurementUnitService $measurementUnits)
    {
    }

    public function index(Request $request): JsonResponse
    {
        return $this->paginated(
            'Measurement units fetched successfully',
            $this->measurementUnits->paginate($request),
            MeasurementUnitResource::class
        );
    }
}
