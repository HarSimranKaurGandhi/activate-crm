<?php

namespace App\Services;

use App\Models\AdjustmentMaster;
use App\Models\CompanyBankDetail;
use App\Models\CompanySetting;
use App\Models\Quotation;
use App\Models\QuotationNumberSetting;
use App\Models\TermMaster;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class QuotationService extends CrudService
{
    protected string $modelClass = Quotation::class;

    protected array $searchColumns = [];

    protected array $relations = ['customer', 'items.discountOverrides', 'adjustments', 'terms'];

    public function __construct(private QuotationCalculator $calculator)
    {
    }

    public function create(array $data): Quotation
    {
        return DB::transaction(function () use ($data): Quotation {
            $items = $data['items'] ?? [];
            $adjustments = $data['adjustments'] ?? [];
            $terms = $data['terms'] ?? [];
            unset($data['items'], $data['adjustments'], $data['terms']);

            $data['quotation_number'] = $data['quotation_number'] ?? $this->nextQuotationNumber();
            $data['status'] = $data['status'] ?? 'draft';
            $data['show_discount_to_customer'] = $data['show_discount_to_customer'] ?? true;

            $quotation = Quotation::create($data);
            $this->syncLines($quotation, $items, $adjustments, $terms);

            return $quotation->refresh()->load($this->relations);
        });
    }

    public function update($model, array $data): Quotation
    {
        return DB::transaction(function () use ($model, $data): Quotation {
            $items = $data['items'] ?? null;
            $adjustments = $data['adjustments'] ?? null;
            $terms = $data['terms'] ?? null;
            unset($data['items'], $data['adjustments'], $data['terms']);

            $model->update($data);

            if (is_array($items)) {
                $model->items->each(fn ($item) => $item->discountOverrides()->delete());
                $model->items()->delete();
                $model->adjustments()->delete();
                $model->terms()->delete();
                $this->syncLines($model, $items, $adjustments ?? [], $terms ?? []);
            }

            return $model->refresh()->load($this->relations);
        });
    }

    public function paginate(Request $request): LengthAwarePaginator
    {
        return $this->query($request)
            ->latest('id')
            ->paginate((int) $request->integer('per_page', 15));
    }

    public function duplicate(Quotation $quotation, int $userId): Quotation
    {
        return DB::transaction(function () use ($quotation, $userId): Quotation {
            $copy = $quotation->replicate(['quotation_number', 'status', 'approved_at']);
            $copy->quotation_number = $this->nextQuotationNumber();
            $copy->status = 'draft';
            $copy->created_by = $userId;
            $copy->save();

            foreach ($quotation->items as $item) {
                $copiedItem = $copy->items()->create($item->replicate(['quotation_id', 'created_at', 'updated_at'])->toArray());
                foreach ($item->discountOverrides as $override) {
                    $copiedItem->discountOverrides()->create($override->replicate(['quotation_item_id', 'created_at', 'updated_at'])->toArray());
                }
            }
            foreach ($quotation->adjustments as $adjustment) {
                $copy->adjustments()->create($adjustment->replicate(['quotation_id', 'created_at', 'updated_at'])->toArray());
            }
            foreach ($quotation->terms as $term) {
                $copy->terms()->create($term->replicate(['quotation_id', 'created_at', 'updated_at'])->toArray());
            }

            return $copy->load($this->relations);
        });
    }

    public function defaults(): array
    {
        return [
            'company' => CompanySetting::first([
                'company_name',
                'phone',
                'email',
                'gst_number',
                'logo_path',
                'letterhead_path',
                'signature_path',
                'default_salesperson_name',
                'default_salesperson_phone',
                'default_salesperson_email',
            ]),
            'default_bank_detail' => CompanyBankDetail::where('is_default', true)->where('is_active', true)->first(),
            'numbering' => QuotationNumberSetting::first(),
            'active_adjustments' => AdjustmentMaster::where('is_active', true)->orderBy('display_order')->orderBy('name')->get(),
            'active_terms' => TermMaster::where('is_active', true)->orderBy('display_order')->orderBy('title')->get(),
            'pricing_modes' => ['exclusive_gst', 'inclusive_gst'],
            'statuses' => ['draft', 'pending_approval', 'approved', 'rejected', 'revised'],
        ];
    }

    protected function applyFilters(Builder $query, Request $request): Builder
    {
        return $query
            ->when($request->filled('search'), function (Builder $q) use ($request): void {
                $search = $request->string('search')->toString();
                $q->where(function (Builder $builder) use ($search): void {
                    $builder
                        ->where('quotation_number', 'like', "%{$search}%")
                        ->orWhere('salesperson_name', 'like', "%{$search}%")
                        ->orWhereHas('customer', function (Builder $customerQuery) use ($search): void {
                            $customerQuery
                                ->where('primary_name', 'like', "%{$search}%")
                                ->orWhere('company_name', 'like', "%{$search}%");
                        });
                });
            })
            ->when($request->filled('status'), fn (Builder $q) => $q->where('status', $request->string('status')))
            ->when($request->filled('customer_id'), fn (Builder $q) => $q->where('customer_id', $request->integer('customer_id')))
            ->when($request->filled('created_by'), fn (Builder $q) => $q->where('created_by', $request->integer('created_by')))
            ->when($request->filled('from_date'), fn (Builder $q) => $q->whereDate('quote_date', '>=', $request->date('from_date')))
            ->when($request->filled('to_date'), fn (Builder $q) => $q->whereDate('quote_date', '<=', $request->date('to_date')));
    }

    private function syncLines(Quotation $quotation, array $items, array $adjustments, array $terms): void
    {
        $totals = [
            'subtotal_before_discount' => 0,
            'total_line_discount' => 0,
            'subtotal_after_discount' => 0,
            'total_adjustments' => 0,
            'total_tax' => 0,
            'grand_total' => 0,
        ];

        foreach ($items as $item) {
            $snapshot = $this->calculator->buildItemSnapshot($item, $quotation->toArray());
            $quotationItem = $quotation->items()->create($snapshot);
            $this->recordDiscountOverride($quotationItem, $snapshot, $quotation);
            $totals['subtotal_before_discount'] += (float) $snapshot['edited_price'] * (float) $snapshot['quantity'];
            $totals['total_line_discount'] += (float) $snapshot['discount_amount'] * (float) $snapshot['quantity'];
            $totals['subtotal_after_discount'] += (float) $snapshot['price_after_discount'] * (float) $snapshot['quantity'];
            $totals['total_tax'] += (float) $snapshot['tax_amount'];
            $totals['grand_total'] += (float) $snapshot['line_total'];
        }

        foreach ($adjustments as $adjustment) {
            $snapshot = $this->buildAdjustmentSnapshot($adjustment, $totals['subtotal_after_discount']);
            $quotation->adjustments()->create($snapshot);
            $totals['total_adjustments'] += (float) $snapshot['amount'];
            $totals['grand_total'] += (float) $snapshot['amount'];
        }

        foreach ($terms as $term) {
            $quotation->terms()->create($this->buildTermSnapshot($term));
        }

        $quotation->update($totals);
    }

    private function recordDiscountOverride($quotationItem, array $snapshot, Quotation $quotation): void
    {
        $hasDiscount = (float) $snapshot['discount_percent'] > 0 || (float) $snapshot['discount_amount'] > 0;
        $hasEditedPrice = (float) $snapshot['edited_price'] !== (float) $snapshot['base_price'];

        if (! $hasDiscount && ! $hasEditedPrice) {
            return;
        }

        $quotationItem->discountOverrides()->create([
            'discount_percent' => $snapshot['discount_percent'],
            'discount_amount' => $snapshot['discount_amount'],
            'reason' => $hasEditedPrice ? 'Edited price / discount captured during quotation save.' : 'Discount captured during quotation save.',
            'created_by' => $quotation->created_by,
        ]);
    }

    private function buildAdjustmentSnapshot(array $input, float $subtotalAfterDiscount): array
    {
        $master = AdjustmentMaster::findOrFail($input['adjustment_master_id']);
        $value = (float) ($input['value'] ?? $master->default_value ?? 0);
        $amount = $master->value_type === 'percent'
            ? round(($subtotalAfterDiscount * $value) / 100, 2)
            : round($value, 2);

        if ($master->adjustment_type === 'discount') {
            $amount = -abs($amount);
        }

        return [
            'adjustment_master_id' => $master->id,
            'name' => $master->name,
            'code' => $master->code,
            'adjustment_type' => $master->adjustment_type,
            'value_type' => $master->value_type,
            'value' => $value,
            'amount' => $amount,
            'is_taxable' => (bool) $master->is_taxable,
            'display_order' => (int) ($input['display_order'] ?? $master->display_order ?? 0),
        ];
    }

    private function buildTermSnapshot(array $input): array
    {
        $term = TermMaster::findOrFail($input['term_master_id']);

        return [
            'term_master_id' => $term->id,
            'title' => $term->title,
            'content' => $term->content,
            'display_order' => (int) ($input['display_order'] ?? $term->display_order ?? 0),
        ];
    }

    private function nextQuotationNumber(): string
    {
        $setting = QuotationNumberSetting::query()->firstOrNew(['id' => 1]);
        $columns = Schema::getColumnListing('quotation_number_settings');
        $prefix = in_array('quotation_prefix', $columns, true) ? ($setting->quotation_prefix ?: 'QT-') : 'QT-';
        $padding = in_array('padding', $columns, true) ? ((int) ($setting->padding ?: 5)) : 5;
        $next = in_array('next_number', $columns, true) ? max((int) ($setting->next_number ?: 1), 1) : 1;

        while (Quotation::query()->where('quotation_number', $prefix.str_pad((string) $next, $padding, '0', STR_PAD_LEFT))->exists()) {
            $next++;
        }

        $attributes = [];

        if (in_array('quotation_prefix', $columns, true)) {
            $attributes['quotation_prefix'] = $prefix;
        }

        if (in_array('padding', $columns, true)) {
            $attributes['padding'] = $padding;
        }

        if (in_array('next_number', $columns, true)) {
            $attributes['next_number'] = $next + 1;
        }

        if ($attributes !== []) {
            $setting->fill(Arr::only($attributes, $columns));
            $setting->save();
        }

        return $prefix.str_pad((string) $next, $padding, '0', STR_PAD_LEFT);
    }
}
