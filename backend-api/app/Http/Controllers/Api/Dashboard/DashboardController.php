<?php

namespace App\Http\Controllers\Api\Dashboard;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Dashboard\DashboardSummaryRequest;
use App\Services\DashboardService;
use App\Services\LeaderboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends ApiController
{
    public function __construct(
        private DashboardService $dashboard,
        private LeaderboardService $leaderboard
    )
    {
    }

    public function summary(DashboardSummaryRequest $request): JsonResponse
    {
        return $this->ok(
            'Dashboard summary fetched successfully',
            $this->dashboard->summary($request)
        );
    }

    public function leaderboard(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'period' => ['nullable', 'in:today,week,month'],
        ]);

        return $this->ok(
            'Leaderboard fetched successfully',
            $this->leaderboard->current($validated['period'] ?? 'today', true)
        );
    }
}
