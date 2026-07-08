<?php

namespace App\Services;

use App\Models\Lead;
use App\Models\Quotation;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class DashboardService
{
    public function quotationSummary(Request $request): array
    {
        $user = $request->user();
        $scope = $request->string('scope')->toString() === 'all' ? 'all' : 'mine';
        $canViewAll = $user instanceof User && $user->hasAnyRole(['admin']) && $scope === 'all';

        $quotationQuery = Quotation::query()
            ->when($request->filled('from_date'), fn (Builder $query) => $query->whereDate('quote_date', '>=', $request->date('from_date')))
            ->when($request->filled('to_date'), fn (Builder $query) => $query->whereDate('quote_date', '<=', $request->date('to_date')));

        if ($user instanceof User) {
            $user->loadMissing('role');

            if (! $canViewAll) {
                $quotationQuery->where('created_by', $user->getKey());
            }
        }

        $summary = $quotationQuery
            ->selectRaw('COUNT(*) as total_quotations')
            ->first();

        $pendingApprovalCount = 0;

        if ($user instanceof User) {
            $pendingQuery = Quotation::query()->where('status', 'pending_approval');

            if (! $canViewAll) {
                $pendingQuery->where('created_by', $user->getKey());
            }

            $pendingApprovalCount = (int) $pendingQuery->count();
        }

        $taskQuery = Task::query()
            ->with('assignedUser')
            ->whereDate('due_date', now()->toDateString())
            ->orderBy('due_date')
            ->latest('id');

        if ($user instanceof User) {
            $user->loadMissing('role');

            if (! $canViewAll) {
                $taskQuery->where('assigned_to', $user->getKey());
            }
        }

        $tasksDueToday = $taskQuery->get()->map(fn (Task $task) => [
            'id' => $task->id,
            'name' => $task->name,
            'description' => $task->description,
            'status' => $task->status,
            'due_date' => optional($task->due_date)?->format('Y-m-d'),
            'assigned_to' => $task->assigned_to,
            'assigned_user' => $task->assignedUser ? [
                'id' => $task->assignedUser->id,
                'name' => $task->assignedUser->name,
                'email' => $task->assignedUser->email,
                'phone' => $task->assignedUser->phone,
                'designation' => $task->assignedUser->designation,
            ] : null,
        ])->values()->all();

        $overdueTaskQuery = Task::query()
            ->with('assignedUser')
            ->whereDate('due_date', '<', now()->toDateString())
            ->where('status', '!=', 'completed')
            ->orderBy('due_date')
            ->latest('id');

        if ($user instanceof User) {
            $user->loadMissing('role');

            if (! $canViewAll) {
                $overdueTaskQuery->where('assigned_to', $user->getKey());
            }
        }

        $overdueTasks = $overdueTaskQuery->get()->map(fn (Task $task) => [
            'id' => $task->id,
            'name' => $task->name,
            'description' => $task->description,
            'status' => $task->status,
            'due_date' => optional($task->due_date)?->format('Y-m-d'),
            'assigned_to' => $task->assigned_to,
            'assigned_user' => $task->assignedUser ? [
                'id' => $task->assignedUser->id,
                'name' => $task->assignedUser->name,
                'email' => $task->assignedUser->email,
                'phone' => $task->assignedUser->phone,
                'designation' => $task->assignedUser->designation,
            ] : null,
        ])->values()->all();

        $leadFollowUpBaseQuery = Lead::query()
            ->with('assignedUser')
            ->orderBy('follow_up_date')
            ->latest('id');

        if ($user instanceof User) {
            $user->loadMissing('role');

            if (! $canViewAll) {
                $leadFollowUpBaseQuery->where('assigned_to', $user->getKey());
            }
        }

        $mapLead = fn (Lead $lead) => [
            'id' => $lead->id,
            'name' => $lead->name,
            'phone' => $lead->phone,
            'email' => $lead->email,
            'city' => $lead->city,
            'status' => $lead->status,
            'requirement' => $lead->requirement,
            'follow_up_date' => optional($lead->follow_up_date)?->format('Y-m-d'),
            'assigned_to' => $lead->assigned_to,
            'assigned_user' => $lead->assignedUser ? [
                'id' => $lead->assignedUser->id,
                'name' => $lead->assignedUser->name,
                'email' => $lead->assignedUser->email,
                'phone' => $lead->assignedUser->phone,
                'designation' => $lead->assignedUser->designation,
            ] : null,
        ];

        $today = now()->toDateString();
        $followUpsDueToday = (clone $leadFollowUpBaseQuery)
            ->whereDate('follow_up_date', $today)
            ->get()
            ->map($mapLead)
            ->values()
            ->all();

        $overdueFollowUps = (clone $leadFollowUpBaseQuery)
            ->whereDate('follow_up_date', '<', $today)
            ->whereNotIn('status', ['closed_success', 'closed_fail'])
            ->get()
            ->map($mapLead)
            ->values()
            ->all();

        return [
            'total_quotations' => (int) ($summary->total_quotations ?? 0),
            'pending_for_approval' => $pendingApprovalCount,
            'tasks_due_today_count' => count($tasksDueToday),
            'tasks_due_today' => $tasksDueToday,
            'overdue_tasks_count' => count($overdueTasks),
            'overdue_tasks' => $overdueTasks,
            'follow_ups_due_today_count' => count($followUpsDueToday),
            'follow_ups_due_today' => $followUpsDueToday,
            'overdue_follow_ups_count' => count($overdueFollowUps),
            'overdue_follow_ups' => $overdueFollowUps,
        ];
    }
}
