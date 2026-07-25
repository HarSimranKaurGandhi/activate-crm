<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Lead;
use App\Models\Leaderboard;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;

class LeaderboardService
{
    private const CLOSED_STATUSES = ['closed_success', 'closed_fail'];

    public function current(string $periodType): array
    {
        [$start, $end] = $this->period($periodType);

        return [
            'period' => $periodType,
            'period_start' => $start->toDateString(),
            'period_end' => $end->toDateString(),
            'rows' => $this->calculate($start, $end)->values()->all(),
        ];
    }

    public function snapshotAll(): int
    {
        $snapshotDate = CarbonImmutable::today();
        $count = 0;

        foreach (['today', 'week', 'month'] as $periodType) {
            [$start, $end] = $this->period($periodType);

            foreach ($this->calculate($start, $end) as $row) {
                Leaderboard::query()->updateOrCreate(
                    [
                        'user_id' => $row['user_id'],
                        'period_type' => $periodType,
                        'snapshot_date' => $snapshotDate->toDateString(),
                    ],
                    [
                        'period_start' => $start->toDateString(),
                        'period_end' => $end->toDateString(),
                        'user_name' => $row['user_name'],
                        'user_designation' => $row['designation'],
                        'total_due_follow_ups' => $row['total_due_follow_ups'],
                        'follow_ups_done' => $row['follow_ups_done'],
                        'success_count' => $row['success'],
                        'failed_count' => $row['failed'],
                        'pending_follow_ups' => $row['pending_follow_ups'],
                        'score' => $row['score'],
                        'calculated_at' => now(),
                    ]
                );
                $count++;
            }
        }

        return $count;
    }

    private function calculate(CarbonImmutable $start, CarbonImmutable $end): Collection
    {
        $startAt = $start->startOfDay();
        $endAt = $end->endOfDay();

        $due = Lead::query()
            ->selectRaw('assigned_to, COUNT(*) as aggregate')
            ->whereNotNull('assigned_to')
            ->whereBetween('follow_up_date', [$start->toDateString(), $end->toDateString()])
            ->groupBy('assigned_to')
            ->pluck('aggregate', 'assigned_to');

        $success = $this->callOutcomeCounts(true, $startAt, $endAt);
        $failed = $this->callOutcomeCounts(false, $startAt, $endAt);

        $pending = Lead::query()
            ->selectRaw('assigned_to, COUNT(*) as aggregate')
            ->whereNotNull('assigned_to')
            ->whereNotNull('follow_up_date')
            ->whereDate('follow_up_date', '<', $end->toDateString())
            ->whereNotIn('status', self::CLOSED_STATUSES)
            ->groupBy('assigned_to')
            ->pluck('aggregate', 'assigned_to');

        return User::query()
            ->with('role:id,name')
            ->orderBy('name')
            ->get()
            ->map(function (User $user) use ($due, $success, $failed, $pending): array {
                $successCount = (int) ($success[$user->id] ?? 0);
                $failedCount = (int) ($failed[$user->id] ?? 0);
                $doneCount = $successCount + $failedCount;
                $pendingCount = (int) ($pending[$user->id] ?? 0);

                return [
                    'user_id' => $user->id,
                    'user_name' => $user->name,
                    'designation' => $user->designation,
                    'role' => $user->role?->name,
                    'total_due_follow_ups' => (int) ($due[$user->id] ?? 0),
                    'follow_ups_done' => $doneCount,
                    'success' => $successCount,
                    'failed' => $failedCount,
                    'pending_follow_ups' => $pendingCount,
                    'score' => round(
                        (10 * $successCount) - (5 * $failedCount) + $doneCount - ($pendingCount / 2),
                        2
                    ),
                ];
            })
            ->sortByDesc('score');
    }

    private function callOutcomeCounts(
        bool $connected,
        CarbonImmutable $startAt,
        CarbonImmutable $endAt
    ): Collection {
        $query = ActivityLog::query()
            ->where('module', 'leads')
            ->where('entity_type', 'lead')
            ->where('action', 'called')
            ->where('new_values->connected', $connected)
            ->whereBetween('created_at', [$startAt, $endAt]);

        if (Schema::hasColumn('activity_logs', 'created_by')) {
            return $query
                ->selectRaw('created_by as actor_id, COUNT(*) as aggregate')
                ->whereNotNull('created_by')
                ->groupBy('created_by')
                ->pluck('aggregate', 'actor_id');
        }

        $actorExpression = "CAST(JSON_UNQUOTE(JSON_EXTRACT(new_values, '$.actor.id')) AS UNSIGNED)";

        return $query
            ->selectRaw("{$actorExpression} as actor_id, COUNT(*) as aggregate")
            ->whereNotNull('new_values->actor->id')
            ->groupByRaw($actorExpression)
            ->pluck('aggregate', 'actor_id');
    }

    private function period(string $periodType): array
    {
        $today = CarbonImmutable::today();

        return match ($periodType) {
            'week' => [$today->startOfWeek(), $today],
            'month' => [$today->startOfMonth(), $today],
            default => [$today, $today],
        };
    }
}
