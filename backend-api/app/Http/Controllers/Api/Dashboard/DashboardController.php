<?php

namespace App\Http\Controllers\Api\Dashboard;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Dashboard\QuotationSummaryRequest;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;

class DashboardController extends ApiController
{
    public function __construct(private DashboardService $dashboard)
    {
    }

    public function quotationSummary(QuotationSummaryRequest $request): JsonResponse
    {
        return $this->ok(
            'Quotation summary fetched successfully',
            $this->dashboard->quotationSummary($request)
        );
    }
}
