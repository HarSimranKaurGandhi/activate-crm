<?php

namespace App\Policies;

use App\Models\Quotation;
use App\Models\User;

class QuotationPolicy
{
    public function view(User $user, Quotation $quotation): bool
    {
        return $user->hasAnyRole(['admin', 'operations']) || (int) $quotation->created_by === (int) $user->id;
    }

    public function update(User $user, Quotation $quotation): bool
    {
        return $quotation->status !== 'approved'
            && ($user->hasAnyRole(['admin', 'sales']) || (int) $quotation->created_by === (int) $user->id);
    }

    public function approve(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'operations']);
    }
}
