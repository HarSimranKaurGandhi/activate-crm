<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Quotation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class QuotationApprovalService
{
    private ?array $quotationColumns = null;
    private ?array $quotationApprovalColumns = null;
    private ?array $activityLogColumns = null;

    private const TRANSITIONS = [
        'submit_for_approval' => [
            'from' => ['draft', 'revised'],
            'to' => 'pending_approval',
            'description' => 'Quotation submitted for approval.',
        ],
        'approve' => [
            'from' => ['pending_approval'],
            'to' => 'approved',
            'description' => 'Quotation approved.',
        ],
        'reject' => [
            'from' => ['pending_approval'],
            'to' => 'rejected',
            'description' => 'Quotation rejected.',
        ],
        'revise' => [
            'from' => ['pending_approval', 'approved', 'rejected'],
            'to' => 'revised',
            'description' => 'Quotation marked for revision.',
        ],
    ];

    private array $relations = ['customer', 'items.discountOverrides', 'adjustments', 'terms', 'approvals.actor'];

    public function submit(int|string $id, User $user, Request $request): Quotation
    {
        return $this->transition($this->find($id), 'submit_for_approval', $user, $request);
    }

    public function approve(int|string $id, User $user, Request $request): Quotation
    {
        return $this->transition($this->find($id), 'approve', $user, $request);
    }

    public function reject(int|string $id, User $user, Request $request): Quotation
    {
        return $this->transition($this->find($id), 'reject', $user, $request);
    }

    public function revise(int|string $id, User $user, Request $request): Quotation
    {
        return $this->transition($this->find($id), 'revise', $user, $request);
    }

    public function activity(int|string $id): Collection
    {
        $quotation = $this->find($id);
        $approvalTimestampColumn = $this->getQuotationApprovalTimestampColumn();

        $approvals = $quotation->approvals()
            ->with('actor')
            ->orderBy($approvalTimestampColumn)
            ->get()
            ->map(fn ($approval): array => [
                'id' => $approval->id,
                'source' => 'quotation_approvals',
                'action' => $this->expandStoredApprovalAction((string) $approval->action),
                'status' => self::TRANSITIONS[$this->expandStoredApprovalAction((string) $approval->action)]['to'] ?? $approval->action,
                'remarks' => $approval->remarks,
                'actor' => $approval->actor ? [
                    'id' => $approval->actor->id,
                    'name' => $approval->actor->name,
                    'email' => $approval->actor->email,
                ] : null,
                'occurred_at' => data_get($approval, $approvalTimestampColumn),
            ]);

        $logs = ActivityLog::query()
            ->with('user')
            ->where('module', 'quotations')
            ->where('entity_type', 'quotation')
            ->where('entity_id', $quotation->id)
            ->orderBy('created_at')
            ->get()
            ->map(fn ($log): array => [
                'id' => $log->id,
                'source' => 'activity_logs',
                'action' => $log->action,
                'status' => $log->new_values['status'] ?? null,
                'description' => $log->description,
                'actor' => $log->user ? [
                    'id' => $log->user->id,
                    'name' => $log->user->name,
                    'email' => $log->user->email,
                ] : null,
                'occurred_at' => $log->created_at,
            ]);

        return $approvals
            ->merge($logs)
            ->sortBy('occurred_at')
            ->values();
    }

    private function transition(Quotation $quotation, string $action, User $user, Request $request): Quotation
    {
        $rule = self::TRANSITIONS[$action];
        $currentStatus = (string) $quotation->status;

        if (! in_array($currentStatus, $rule['from'], true)) {
            throw ValidationException::withMessages([
                'status' => [sprintf(
                    'Quotation status must be one of [%s] before it can be changed to %s.',
                    implode(', ', $rule['from']),
                    $rule['to'],
                )],
            ]);
        }

        return DB::transaction(function () use ($quotation, $action, $rule, $currentStatus, $user, $request): Quotation {
            $remarks = $request->input('remarks');
            $targetStatus = $rule['to'];

            $updates = [
                'status' => $targetStatus,
                'rejected_reason' => $targetStatus === 'rejected' ? $remarks : null,
            ];

            if ($targetStatus === 'approved') {
                $updates['approved_by'] = $user->id;
                $updates['approved_at'] = now();
            }

            if (in_array($targetStatus, ['pending_approval', 'revised'], true)) {
                $updates['approved_by'] = null;
                $updates['approved_at'] = null;
            }

            $quotation->update(Arr::only($updates, $this->getQuotationColumns()));

            $approvalData = $this->normalizeQuotationApprovalData([
                'action' => $this->storedApprovalAction($action),
                'remarks' => $remarks,
                'acted_by' => $user->id,
                'acted_at' => now(),
            ], $this->getQuotationApprovalColumns());

            if ($approvalData !== []) {
                DB::table('quotation_approvals')->insert(
                    Arr::only(
                        ['quotation_id' => $quotation->id] + $approvalData,
                        $this->getQuotationApprovalColumns(),
                    ),
                );
            }

            $activityData = Arr::only([
                'module' => 'quotations',
                'entity_type' => 'quotation',
                'entity_id' => $quotation->id,
                'action' => $action,
                'description' => $rule['description'],
                'old_values' => ['status' => $currentStatus],
                'new_values' => ['status' => $targetStatus],
                'created_by' => $user->id,
                'ip_address' => $request->ip(),
            ], $this->getActivityLogColumns());

            if ($activityData !== []) {
                $activity = new ActivityLog($activityData);
                $activity->timestamps = $this->usesTimestamps($this->getActivityLogColumns());
                $activity->save();
            }

            return $quotation->refresh()->load($this->relations);
        });
    }

    private function find(int|string $id): Quotation
    {
        return Quotation::query()->findOrFail($id);
    }

    private function getQuotationColumns(): array
    {
        return $this->quotationColumns ??= Schema::getColumnListing('quotations');
    }

    private function getQuotationApprovalColumns(): array
    {
        return $this->quotationApprovalColumns ??= Schema::getColumnListing('quotation_approvals');
    }

    private function getActivityLogColumns(): array
    {
        return $this->activityLogColumns ??= Schema::getColumnListing('activity_logs');
    }

    private function usesTimestamps(array $columns): bool
    {
        return in_array('created_at', $columns, true) && in_array('updated_at', $columns, true);
    }

    private function normalizeQuotationApprovalData(array $data, array $columns): array
    {
        if (! in_array('acted_by', $columns, true) && in_array('action_by', $columns, true)) {
            $data['action_by'] = $data['acted_by'] ?? null;
            unset($data['acted_by']);
        }

        if (! in_array('acted_at', $columns, true) && in_array('action_at', $columns, true)) {
            $data['action_at'] = $data['acted_at'] ?? null;
            unset($data['acted_at']);
        }

        if (! in_array('acted_at', $columns, true) && ! in_array('action_at', $columns, true) && in_array('created_at', $columns, true)) {
            $data['created_at'] = $data['acted_at'] ?? null;
            unset($data['acted_at']);
        }

        return Arr::only($data, $columns);
    }

    private function storedApprovalAction(string $action): string
    {
        return match ($action) {
            'submit_for_approval' => 'submitted',
            'approve' => 'approved',
            'reject' => 'rejected',
            'revise' => 'revised',
            default => $action,
        };
    }

    private function expandStoredApprovalAction(string $action): string
    {
        return match ($action) {
            'submitted' => 'submit_for_approval',
            'approved' => 'approve',
            'rejected' => 'reject',
            'revised' => 'revise',
            default => $action,
        };
    }

    private function getQuotationApprovalTimestampColumn(): string
    {
        $columns = $this->getQuotationApprovalColumns();

        return match (true) {
            in_array('acted_at', $columns, true) => 'acted_at',
            in_array('action_at', $columns, true) => 'action_at',
            in_array('created_at', $columns, true) => 'created_at',
            default => 'id',
        };
    }
}
