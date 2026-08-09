<?php

namespace App\Services;

use App\Models\Lead;
use App\Models\LeadWhatsappFollowUp;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LeadWhatsappFollowUpService
{
    private const DAILY_LIMIT = 15;
    private const CLOSED_STATUSES = ['closed_success', 'closed_fail'];

    public function due(User $user): array
    {
        $today = now()->toDateString();
        $sentToday = LeadWhatsappFollowUp::query()
            ->where('user_id', $user->id)
            ->whereDate('sent_on', $today)
            ->count();
        $remaining = max(self::DAILY_LIMIT - $sentToday, 0);

        $leads = Lead::query()
            ->where('assigned_to', $user->id)
            ->whereNotIn('status', self::CLOSED_STATUSES)
            ->whereNotNull('phone')
            ->whereNotNull('follow_up_date')
            ->whereDate('follow_up_date', '<=', $today)
            ->whereDoesntHave('whatsappFollowUps', fn ($query) => $query
                ->where('user_id', $user->id)
                ->whereDate('sent_on', $today))
            ->orderBy('follow_up_date')
            ->limit($remaining)
            ->get(['id', 'name', 'phone', 'requirement', 'follow_up_date', 'status'])
            ->map(function (Lead $lead): array {
                $daysOverdue = (int) max(0, $lead->follow_up_date->diffInDays(now()->startOfDay(), false));

                return [
                    'id' => $lead->id,
                    'name' => $lead->name,
                    'phone' => $lead->phone,
                    'requirement' => $lead->requirement,
                    'follow_up_date' => $lead->follow_up_date->format('Y-m-d'),
                    'days_overdue' => $daysOverdue,
                    'category' => $daysOverdue > 365 ? 'year' : ($daysOverdue > 30 ? 'month' : ($daysOverdue > 7 ? 'week' : 'regular')),
                ];
            })
            ->values();

        return [
            'daily_limit' => self::DAILY_LIMIT,
            'sent_today' => $sentToday,
            'remaining_today' => $remaining,
            'leads' => $leads,
        ];
    }

    public function record(User $user, Lead $lead, ?string $message): array
    {
        return DB::transaction(function () use ($user, $lead, $message): array {
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $today = now()->toDateString();

            if ((int) $lead->assigned_to !== (int) $user->id
                || in_array($lead->status, self::CLOSED_STATUSES, true)
                || blank($lead->phone)
                || ! $lead->follow_up_date
                || $lead->follow_up_date->isAfter(now()->startOfDay())) {
                throw ValidationException::withMessages(['lead' => ['This lead is not an eligible due follow-up for this token owner.']]);
            }

            $existing = LeadWhatsappFollowUp::query()
                ->where('lead_id', $lead->id)
                ->where('user_id', $user->id)
                ->whereDate('sent_on', $today)
                ->first();

            if ($existing) {
                return ['recorded' => false, 'already_recorded' => true, 'remaining_today' => $this->remaining($user, $today)];
            }

            if ($this->remaining($user, $today) <= 0) {
                throw ValidationException::withMessages(['daily_limit' => ['The daily WhatsApp follow-up limit of 15 has been reached.']]);
            }

            LeadWhatsappFollowUp::query()->create([
                'lead_id' => $lead->id,
                'user_id' => $user->id,
                'sent_on' => $today,
                'message' => $message,
            ]);

            return ['recorded' => true, 'already_recorded' => false, 'remaining_today' => $this->remaining($user, $today)];
        });
    }

    private function remaining(User $user, string $date): int
    {
        $sent = LeadWhatsappFollowUp::query()->where('user_id', $user->id)->whereDate('sent_on', $date)->count();

        return max(self::DAILY_LIMIT - $sent, 0);
    }
}
