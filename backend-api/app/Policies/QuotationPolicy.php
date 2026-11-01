<?php

namespace App\Policies;

use App\Models\Quotation;
use App\Models\User;

class QuotationPolicy
{
    public function changeStatus(User $user, Quotation $quotation, string $status): bool
    {
        return $quotation->status !== 'locked'
            || in_array($status, ['locked', 'executed'], true)
            || $user->hasAnyRole(['admin']);
    }

    public function view(User $user, Quotation $quotation): bool
    {
        return $user->hasAnyRole(['admin', 'operations', 'sales_manager'])
            || (int) $quotation->created_by === (int) $user->id
            || $quotation->sharedUsers()->whereKey($user->id)->exists();
    }

    public function update(User $user, Quotation $quotation): bool
    {
        return ! in_array($quotation->status, ['approved', 'locked', 'executed'], true)
            && ($user->hasAnyRole(['admin', 'sales']) || (int) $quotation->created_by === (int) $user->id
                || $quotation->sharedUsers()->whereKey($user->id)->exists());
    }

    public function manageSharing(User $user, Quotation $quotation): bool
    {
        if ($user->hasAnyRole(['influencer'])) return false;
        return $user->hasAnyRole(['admin', 'operations', 'sales_manager'])
            || (int) $quotation->created_by === (int) $user->id;
    }

    public function approve(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'operations', 'sales_manager']);
    }
}
