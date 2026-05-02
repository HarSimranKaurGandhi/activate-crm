<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuotationTerm extends Model
{
    protected $table = 'quotation_terms';

    protected $fillable = ['quotation_id', 'term_master_id', 'title', 'content', 'display_order'];

    protected function casts(): array
    {
        return ['display_order' => 'integer'];
    }

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class);
    }

    public function master(): BelongsTo
    {
        return $this->belongsTo(TermMaster::class, 'term_master_id');
    }
}
