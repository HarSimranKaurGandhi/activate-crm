<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuotationApproval extends Model
{
    protected $table = 'quotation_approvals';

    protected $fillable = ['quotation_id', 'action', 'remarks', 'acted_by', 'acted_at', 'action_by', 'action_at'];

    protected function casts(): array
    {
        return ['acted_at' => 'datetime', 'action_at' => 'datetime'];
    }

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'action_by');
    }
}
