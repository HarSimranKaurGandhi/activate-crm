<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quotation extends Model
{
    protected $table = 'quotations';

    protected $fillable = [
        'quotation_number', 'customer_id', 'salesperson_name', 'salesperson_phone',
        'salesperson_email', 'quote_date', 'valid_until', 'pricing_mode',
        'show_discount_to_customer', 'default_discount_percent', 'default_discount_amount',
        'intro_text', 'remarks', 'internal_notes', 'subtotal_before_discount',
        'total_line_discount', 'subtotal_after_discount', 'total_adjustments',
        'total_tax', 'subtotal', 'discount_total', 'taxable_total', 'tax_total', 'adjustment_total',
        'grand_total', 'status', 'internal_remarks', 'created_by', 'approved_by',
        'approved_at', 'rejected_reason',
    ];

    protected function casts(): array
    {
        return [
            'quote_date' => 'date',
            'valid_until' => 'date',
            'show_discount_to_customer' => 'boolean',
            'default_discount_percent' => 'decimal:2',
            'default_discount_amount' => 'decimal:2',
            'subtotal_before_discount' => 'decimal:2',
            'total_line_discount' => 'decimal:2',
            'subtotal_after_discount' => 'decimal:2',
            'total_adjustments' => 'decimal:2',
            'total_tax' => 'decimal:2',
            'subtotal' => 'decimal:2',
            'discount_total' => 'decimal:2',
            'taxable_total' => 'decimal:2',
            'tax_total' => 'decimal:2',
            'adjustment_total' => 'decimal:2',
            'grand_total' => 'decimal:2',
            'approved_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(QuotationItem::class);
    }

    public function adjustments(): HasMany
    {
        return $this->hasMany(QuotationAdjustment::class);
    }

    public function terms(): HasMany
    {
        return $this->hasMany(QuotationTerm::class);
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(QuotationApproval::class);
    }

    public function files(): HasMany
    {
        return $this->hasMany(QuotationFile::class);
    }
}
