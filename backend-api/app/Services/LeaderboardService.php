<?php

namespace App\Services;

use App\Models\Lead;
use App\Models\Leaderboard;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class LeaderboardService
{
    private const CLOSED_STATUSES = ['closed_success', 'closed_fail'];

    public function current(string $periodType, bool $salesDepartmentOnly = false): array
    {
        [$start, $end] = $this->period($periodType);

        return [
            'period' => $periodType,
            'period_start' => $start->toDateString(),
            'period_end' => $end->toDateString(),
            'rows' => $this->calculate($start, $end, $salesDepartmentOnly)->values()->all(),
        ];
    }

    public function snapshotAll(): int
    {
        $snapshotDate = CarbonImmutable::today();
        $calculatedAt = now();
        $snapshots = collect();

        foreach (['today', 'week', 'month'] as $periodType) {
            [$start, $end] = $this->period($periodType);

            foreach ($this->calculate($start, $end) as $row) {
                $snapshots->push([
                    'user_id' => $row['user_id'],
                    'period_type' => $periodType,
                    'snapshot_date' => $snapshotDate->toDateString(),
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
                    'calculated_at' => $calculatedAt,
                ]);
            }
        }

        if ($snapshots->isNotEmpty()) {
            Leaderboard::query()->upsert(
                $snapshots->all(),
                ['user_id', 'period_type', 'snapshot_date'],
                [
                    'period_start',
                    'period_end',
                    'user_name',
                    'user_designation',
                    'total_due_follow_ups',
                    'follow_ups_done',
                    'success_count',
                    'failed_count',
                    'pending_follow_ups',
                    'score',
                    'calculated_at',
                ]
            );
        }

        return $snapshots->count();
    }

    private function calculate(CarbonImmutable $start, CarbonImmutable $end, bool $salesDepartmentOnly = false): Collection
    {
        $startDate = $start->toDateString();
        $endDate = $end->toDateString();

        $leadCounts = Lead::query()
            ->selectRaw(
                'leads.assigned_to,
                SUM(CASE WHEN leads.status NOT IN (?, ?) AND leads.follow_up_date BETWEEN ? AND ? THEN 1 ELSE 0 END) as total_due_follow_ups,
                SUM(CASE WHEN leads.status NOT IN (?, ?) AND leads.follow_up_date < ? THEN 1 ELSE 0 END) as pending_follow_ups,
                SUM(CASE WHEN leads.status = ? AND leads.follow_up_date BETWEEN ? AND ? THEN 1 ELSE 0 END) as success_count,
                SUM(CASE WHEN leads.status = ? AND leads.follow_up_date BETWEEN ? AND ? THEN 1 ELSE 0 END) as failed_count',
                [
                    ...self::CLOSED_STATUSES, $startDate, $endDate,
                    ...self::CLOSED_STATUSES, $endDate,
                    'closed_success', $startDate, $endDate,
                    'closed_fail', $startDate, $endDate,
                ]
            )
            ->whereNotNull('assigned_to')
            ->whereNotNull('follow_up_date')
            ->where('follow_up_date', '<=', $endDate)
            ->groupBy('assigned_to');

        return User::query()
            ->when($salesDepartmentOnly, fn ($query) => $query->whereJsonContains('users.departments', 'sales'))
            ->leftJoin('roles', 'roles.id', '=', 'users.role_id')
            ->leftJoinSub($leadCounts, 'lead_counts', 'lead_counts.assigned_to', '=', 'users.id')
            ->orderBy('users.name')
            ->get([
                'users.id',
                'users.name',
                'users.designation',
                'roles.name as role_name',
                'lead_counts.total_due_follow_ups',
                'lead_counts.pending_follow_ups',
                'lead_counts.success_count',
                'lead_counts.failed_count',
            ])
            ->map(function (User $user): array {
                $successCount = (int) ($user->success_count ?? 0);
                $failedCount = (int) ($user->failed_count ?? 0);
                $doneCount = $successCount + $failedCount;
                $pendingCount = (int) ($user->pending_follow_ups ?? 0);

                return [
                    'user_id' => $user->id,
                    'user_name' => $user->name,
                    'designation' => $user->designation,
                    'role' => $user->role_name,
                    'total_due_follow_ups' => (int) ($user->total_due_follow_ups ?? 0),
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
