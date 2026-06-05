<?php

namespace App\Services;

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

        $quotationQuery = Quotation::query()
            ->when($request->filled('from_date'), fn (Builder $query) => $query->whereDate('quote_date', '>=', $request->date('from_date')))
            ->when($request->filled('to_date'), fn (Builder $query) => $query->whereDate('quote_date', '<=', $request->date('to_date')));

        if ($user instanceof User) {
            $user->loadMissing('role');

            if (! $user->hasAnyRole(['admin', 'operations'])) {
                $quotationQuery->where('created_by', $user->getKey());
            }
        }

        $summary = $quotationQuery
            ->selectRaw('COUNT(*) as total_quotations')
            ->selectRaw("SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as pending_for_approval", ['pending_approval'])
            ->first();

        $taskQuery = Task::query()
            ->with('assignedUser')
            ->whereDate('due_date', now()->toDateString())
            ->orderBy('due_date')
            ->latest('id');

        if ($user instanceof User) {
            $user->loadMissing('role');

            if ($user->hasAnyRole(['admin'])) {
                // Admin can see all due-today tasks.
            } else {
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

        return [
            'total_quotations' => (int) ($summary->total_quotations ?? 0),
            'pending_for_approval' => (int) ($summary->pending_for_approval ?? 0),
            'tasks_due_today_count' => count($tasksDueToday),
            'tasks_due_today' => $tasksDueToday,
        ];
    }
}
