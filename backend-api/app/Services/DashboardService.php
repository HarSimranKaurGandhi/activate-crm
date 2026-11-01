<?php

namespace App\Services;

use App\Models\Lead;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class DashboardService
{
    private const CLOSED_LEAD_STATUSES = ['closed_success', 'closed_fail'];

    public function summary(Request $request): array
    {
        $user = $request->user();
        $scope = $request->string('scope')->toString() === 'all' ? 'all' : 'mine';
        $canViewAll = $scope === 'all'
            && $user instanceof User
            && $user->hasAnyRole(['admin']);
        $selectedUserId = $canViewAll && $request->filled('user_id') ? $request->integer('user_id') : null;
        $today = now()->toDateString();

        $taskRows = Task::query()
            ->leftJoin('users as task_assignees', 'task_assignees.id', '=', 'tasks.assigned_to')
            ->whereJsonContains('task_assignees.departments', 'sales')
            ->when($selectedUserId, fn (Builder $query) => $query->where('tasks.assigned_to', $selectedUserId))
            ->where('tasks.due_date', '<=', $today)
            ->where(function (Builder $query) use ($today): void {
                $query
                    ->where('tasks.due_date', $today)
                    ->orWhere('tasks.status', '!=', 'completed');
            })
            ->when(
                $user instanceof User && ! $canViewAll,
                fn (Builder $query) => $query->where('tasks.assigned_to', $user->getKey())
            )
            ->orderBy('tasks.due_date')
            ->orderByDesc('tasks.id')
            ->get([
                'tasks.id',
                'tasks.name',
                'tasks.description',
                'tasks.status',
                'tasks.due_date',
                'tasks.assigned_to',
                'task_assignees.id as assigned_user_id',
                'task_assignees.name as assigned_user_name',
                'task_assignees.email as assigned_user_email',
                'task_assignees.phone as assigned_user_phone',
                'task_assignees.designation as assigned_user_designation',
            ]);

        [$tasksDueTodayRows, $overdueTaskRows] = $taskRows->partition(
            fn (Task $task): bool => optional($task->due_date)?->toDateString() === $today
        );

        $mapTask = static fn (Task $task): array => [
            'id' => $task->id,
            'name' => $task->name,
            'description' => $task->description,
            'status' => $task->status,
            'due_date' => optional($task->due_date)?->format('Y-m-d'),
            'assigned_to' => $task->assigned_to,
            'assigned_user' => $task->assigned_user_id ? [
                'id' => $task->assigned_user_id,
                'name' => $task->assigned_user_name,
                'email' => $task->assigned_user_email,
                'phone' => $task->assigned_user_phone,
                'designation' => $task->assigned_user_designation,
            ] : null,
        ];

        $tasksDueToday = $tasksDueTodayRows->map($mapTask)->values()->all();
        $overdueTasks = $overdueTaskRows->map($mapTask)->values()->all();

        $leadRows = Lead::query()
            ->with('influencer:id,name,phone')
            ->leftJoin('users as lead_assignees', 'lead_assignees.id', '=', 'leads.assigned_to')
            ->whereJsonContains('lead_assignees.departments', 'sales')
            ->when($selectedUserId, fn (Builder $query) => $query->where('leads.assigned_to', $selectedUserId))
            ->whereNotIn('leads.status', self::CLOSED_LEAD_STATUSES)
            ->where('leads.follow_up_date', '<=', $today)
            ->when(
                $user instanceof User && ! $canViewAll,
                fn (Builder $query) => $query->where('leads.assigned_to', $user->getKey())
            )
            ->orderBy('leads.follow_up_date')
            ->orderByDesc('leads.id')
            ->get([
                'leads.id',
                'leads.influencer_id',
                'leads.name',
                'leads.phone',
                'leads.email',
                'leads.city',
                'leads.status',
                'leads.requirement',
                'leads.follow_up_date',
                'leads.assigned_to',
                'lead_assignees.id as assigned_user_id',
                'lead_assignees.name as assigned_user_name',
                'lead_assignees.email as assigned_user_email',
                'lead_assignees.phone as assigned_user_phone',
                'lead_assignees.designation as assigned_user_designation',
            ]);

        [$followUpsDueTodayRows, $overdueFollowUpRows] = $leadRows->partition(
            fn (Lead $lead): bool => optional($lead->follow_up_date)?->toDateString() === $today
        );

        $mapLead = static fn (Lead $lead): array => [
            'id' => $lead->id,
            'name' => $lead->name,
            'phone' => $lead->phone,
            'influencer' => $lead->influencer ? [
                'name' => $lead->influencer->name,
                'phone' => $lead->influencer->phone,
            ] : null,
            'email' => $lead->email,
            'city' => $lead->city,
            'status' => $lead->status,
            'requirement' => $lead->requirement,
            'follow_up_date' => optional($lead->follow_up_date)?->format('Y-m-d'),
            'assigned_to' => $lead->assigned_to,
            'assigned_user' => $lead->assigned_user_id ? [
                'id' => $lead->assigned_user_id,
                'name' => $lead->assigned_user_name,
                'email' => $lead->assigned_user_email,
                'phone' => $lead->assigned_user_phone,
                'designation' => $lead->assigned_user_designation,
            ] : null,
        ];

        $followUpsDueToday = $followUpsDueTodayRows->map($mapLead)->values()->all();
        $overdueFollowUps = $overdueFollowUpRows->map($mapLead)->values()->all();

        return [
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
