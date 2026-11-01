<?php

namespace App\Services;

use App\Models\AdjustmentMaster;
use App\Models\CompanyBankDetail;
use App\Models\CompanySetting;
use App\Models\Customer;
use App\Models\Lead;
use App\Models\Product;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\QuotationItemDiscountOverride;
use App\Models\QuotationNumberSetting;
use App\Models\TermMaster;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class QuotationService extends CrudService
{
    protected string $modelClass = Quotation::class;

    protected array $searchColumns = [];

    protected array $relations = ['customer', 'lead', 'items', 'adjustments', 'terms'];

    private ?array $discountOverrideColumns = null;

    private static ?array $customerColumns = null;

    private ?bool $supportsShowMrpColumn = null;

    private ?bool $supportsShowItemWiseGstColumn = null;

    private ?bool $supportsRoundOffNetAmountColumn = null;

    private ?bool $supportsShowUomColumn = null;

    private ?bool $supportsShowBrandBannerColumn = null;

    private ?bool $supportsBrandBannerIdColumn = null;

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
            $data = $this->resolveCustomerFromLead($data);

            $data['quotation_number'] = $data['quotation_number'] ?? $this->nextQuotationNumber();
            $data['status'] = $data['status'] ?? 'draft';
            $data['show_discount_to_customer'] = $data['show_discount_to_customer'] ?? true;
            $data['show_mrp_to_customer'] = $data['show_mrp_to_customer'] ?? true;
            $data['show_item_wise_gst_to_customer'] = $data['show_item_wise_gst_to_customer'] ?? false;
            $data['round_off_net_amount_to_customer'] = $data['round_off_net_amount_to_customer'] ?? false;
            $data['show_uom_to_customer'] = $data['show_uom_to_customer'] ?? true;
            $data['show_brand_banner_to_customer'] = $data['show_brand_banner_to_customer'] ?? false;
            $data['brand_banner_id'] = ($data['show_brand_banner_to_customer'] ?? false) ? ($data['brand_banner_id'] ?? null) : null;
            if (! empty($data['created_by'])) {
                $data['created_by_name'] = User::query()->whereKey($data['created_by'])->value('name');
            }
            $data = $this->sanitizeForCurrentSchema($data);

            $quotation = Quotation::create($data);
            $this->syncLines($quotation, $items, $adjustments, $terms);

            return $quotation->refresh()->load($this->detailRelations());
        });
    }

    public function update($model, array $data): Quotation
    {
        return DB::transaction(function () use ($model, $data): Quotation {
            $model = Quotation::query()->lockForUpdate()->findOrFail($model->getKey());
            if (in_array($model->status, ['locked', 'executed'], true)) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'status' => 'Locked or executed quotations cannot be edited.',
                ]);
            }

            $items = $data['items'] ?? null;
            $adjustments = $data['adjustments'] ?? null;
            $terms = $data['terms'] ?? null;
            unset($data['items'], $data['adjustments'], $data['terms']);
            $data = $this->resolveCustomerFromLead($data);
            $data['show_mrp_to_customer'] = $data['show_mrp_to_customer'] ?? true;
            $data['show_item_wise_gst_to_customer'] = $data['show_item_wise_gst_to_customer'] ?? false;
            $data['round_off_net_amount_to_customer'] = $data['round_off_net_amount_to_customer'] ?? false;
            $data['show_uom_to_customer'] = $data['show_uom_to_customer']
                ?? ($model->show_uom_to_customer ?? true);
            $data['show_brand_banner_to_customer'] = $data['show_brand_banner_to_customer'] ?? false;
            $data['brand_banner_id'] = ($data['show_brand_banner_to_customer'] ?? false) ? ($data['brand_banner_id'] ?? null) : null;
            $data = $this->sanitizeForCurrentSchema($data);

            $model->update($data);

            if (is_array($items)) {
                if (Schema::hasTable('quotation_item_discount_overrides')) {
                    QuotationItemDiscountOverride::query()
                        ->whereIn('quotation_item_id', $model->items()->select('id'))
                        ->delete();
                }
                $model->items()->delete();
                $model->adjustments()->delete();
                $model->terms()->delete();
                $this->syncLines($model, $items, $adjustments ?? [], $terms ?? []);
            }

            return $model->refresh()->load($this->detailRelations());
        });
    }

    public function paginate(Request $request): LengthAwarePaginator
    {
        return $this->applyFilters($this->visibleQuery($request), $request)
            ->with($this->listRelations())
            ->latest('id')
            ->paginate((int) $request->integer('per_page', 15));
    }

    public function find(int|string $id): Quotation
    {
        return $this->visibleQuery(request())
            ->with($this->detailRelations())
            ->findOrFail($id);
    }

    public function duplicate(Quotation $quotation, int $userId): Quotation
    {
        return DB::transaction(function () use ($quotation, $userId): Quotation {
            $copy = $quotation->replicate(['quotation_number', 'status', 'approved_at']);
            $copy->quotation_number = $this->nextQuotationNumber();
            $copy->status = 'draft';
            $copy->created_by = $userId;
            $copy->created_by_name = User::query()->whereKey($userId)->value('name');
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

            return $copy->load($this->detailRelations());
        });
    }

    public function delete($model): void
    {
        DB::transaction(function () use ($model): void {
            if (Schema::hasTable('quotation_item_discount_overrides')) {
                QuotationItemDiscountOverride::query()
                    ->whereIn('quotation_item_id', $model->items()->select('id'))
                    ->delete();
            }
            $model->items()->delete();
            $model->adjustments()->delete();
            $model->terms()->delete();
            $model->approvals()->delete();
            $model->files()->delete();
            $model->delete();
        });
    }

    public function defaults(): array
    {
        $bankDetailColumns = Schema::hasTable('company_bank_details')
            ? Schema::getColumnListing('company_bank_details')
            : [];

        $defaultBankDetailQuery = CompanyBankDetail::query();

        if (in_array('is_default', $bankDetailColumns, true)) {
            $defaultBankDetailQuery->where('is_default', true);
        }

        if (in_array('is_active', $bankDetailColumns, true)) {
            $defaultBankDetailQuery->where('is_active', true);
        }

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
            'default_bank_detail' => $defaultBankDetailQuery->first(),
            'numbering' => QuotationNumberSetting::first(),
            'active_adjustments' => AdjustmentMaster::where('is_active', true)->orderBy('display_order')->orderBy('name')->get(),
            'active_terms' => TermMaster::where('is_active', true)->orderBy('display_order')->orderBy('title')->get(),
            'pricing_modes' => ['exclusive_gst', 'inclusive_gst'],
            'statuses' => ['draft', 'pending_approval', 'approved', 'locked', 'executed', 'rejected', 'revised'],
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

    private function visibleQuery(Request $request): Builder
    {
        $query = Quotation::query();
        $user = $request->user();

        if (! $user instanceof User) {
            return $query;
        }

        $user->loadMissing('role');

        if ($user->hasAnyRole(['influencer'])) {
            return $query->where('created_by', $user->id)->whereHas('lead', fn ($lead) => $lead->whereIn('influencer_id', \App\Models\Influencer::query()->where('user_id', $user->id)->where('is_active', true)->select('id')));
        }

        if ($user->hasAnyRole(['admin', 'operations', 'sales_manager'])) {
            return $query;
        }

        return $query->where(function (Builder $visible) use ($user): void {
            $visible->where('created_by', $user->getKey())
                ->orWhereHas('sharedUsers', fn (Builder $shared) => $shared->where('users.id', $user->getKey()));
        });
    }

    private function sanitizeForCurrentSchema(array $data): array
    {
        if (! $this->supportsShowMrpColumn()) {
            unset($data['show_mrp_to_customer']);
        }

        if (! $this->supportsShowItemWiseGstColumn()) {
            unset($data['show_item_wise_gst_to_customer']);
        }

        if (! $this->supportsRoundOffNetAmountColumn()) {
            unset($data['round_off_net_amount_to_customer']);
        }

        if (! $this->supportsShowUomColumn()) {
            unset($data['show_uom_to_customer']);
        }

        if (! $this->supportsShowBrandBannerColumn()) {
            unset($data['show_brand_banner_to_customer']);
        }

        if (! $this->supportsBrandBannerIdColumn()) {
            unset($data['brand_banner_id']);
        }

        return $data;
    }

    private function supportsShowMrpColumn(): bool
    {
        if ($this->supportsShowMrpColumn !== null) {
            return $this->supportsShowMrpColumn;
        }

        $this->supportsShowMrpColumn = Schema::hasColumn('quotations', 'show_mrp_to_customer');

        return $this->supportsShowMrpColumn;
    }

    private function supportsShowItemWiseGstColumn(): bool
    {
        if ($this->supportsShowItemWiseGstColumn !== null) {
            return $this->supportsShowItemWiseGstColumn;
        }

        $this->supportsShowItemWiseGstColumn = Schema::hasColumn('quotations', 'show_item_wise_gst_to_customer');

        return $this->supportsShowItemWiseGstColumn;
    }

    private function supportsRoundOffNetAmountColumn(): bool
    {
        if ($this->supportsRoundOffNetAmountColumn !== null) {
            return $this->supportsRoundOffNetAmountColumn;
        }

        $this->supportsRoundOffNetAmountColumn = Schema::hasColumn('quotations', 'round_off_net_amount_to_customer');

        return $this->supportsRoundOffNetAmountColumn;
    }

    private function supportsShowUomColumn(): bool
    {
        if ($this->supportsShowUomColumn !== null) {
            return $this->supportsShowUomColumn;
        }

        $this->supportsShowUomColumn = Schema::hasColumn('quotations', 'show_uom_to_customer');

        return $this->supportsShowUomColumn;
    }

    private function supportsShowBrandBannerColumn(): bool
    {
        if ($this->supportsShowBrandBannerColumn !== null) {
            return $this->supportsShowBrandBannerColumn;
        }

        $this->supportsShowBrandBannerColumn = Schema::hasColumn('quotations', 'show_brand_banner_to_customer');

        return $this->supportsShowBrandBannerColumn;
    }

    private function supportsBrandBannerIdColumn(): bool
    {
        if ($this->supportsBrandBannerIdColumn !== null) {
            return $this->supportsBrandBannerIdColumn;
        }

        $this->supportsBrandBannerIdColumn = Schema::hasColumn('quotations', 'brand_banner_id');

        return $this->supportsBrandBannerIdColumn;
    }

    private function syncLines(Quotation $quotation, array $items, array $adjustments, array $terms): void
    {
        $productIds = collect($items)->pluck('product_id')->filter()->unique();
        $adjustmentMasterIds = collect($adjustments)->pluck('adjustment_master_id')->filter()->unique();
        $termMasterIds = collect($terms)->pluck('term_master_id')->filter()->unique();
        $products = $productIds->isEmpty()
            ? collect()
            : Product::query()->with(['images', 'brand'])->whereKey($productIds)->get()->keyBy('id');
        $adjustmentMasters = $adjustmentMasterIds->isEmpty()
            ? collect()
            : AdjustmentMaster::query()->whereKey($adjustmentMasterIds)->get()->keyBy('id');
        $termMasters = $termMasterIds->isEmpty()
            ? collect()
            : TermMaster::query()->whereKey($termMasterIds)->get()->keyBy('id');

        $totals = [
            'subtotal_before_discount' => 0,
            'total_line_discount' => 0,
            'subtotal_after_discount' => 0,
            'total_adjustments' => 0,
            'total_tax' => 0,
            'grand_total' => 0,
        ];
        $taxableAdjustmentTotal = 0.0;

        foreach ($items as $item) {
            $productId = (int) $item['product_id'];
            $product = $products->get($productId)
                ?? Product::query()->with(['images', 'brand'])->findOrFail($productId);
            $snapshot = $this->calculator->buildItemSnapshot($item, $quotation->toArray(), $product);
            $quotationItem = $quotation->items()->create($snapshot);
            $this->recordDiscountOverride($quotationItem, $snapshot, $quotation);
            $totals['subtotal_before_discount'] += (float) $snapshot['edited_price'] * (float) $snapshot['quantity'];
            $totals['total_line_discount'] += (float) $snapshot['discount_amount'] * (float) $snapshot['quantity'];
            $totals['subtotal_after_discount'] += (float) $snapshot['price_after_discount'] * (float) $snapshot['quantity'];
            $totals['total_tax'] += (float) $snapshot['tax_amount'];
            $totals['grand_total'] += (float) $snapshot['line_total'];
        }

        foreach ($adjustments as $adjustment) {
            $masterId = (int) ($adjustment['adjustment_master_id'] ?? 0);
            $master = $masterId > 0
                ? ($adjustmentMasters->get($masterId) ?? AdjustmentMaster::findOrFail($masterId))
                : null;
            $snapshot = $this->buildAdjustmentSnapshot($adjustment, $totals['subtotal_after_discount'], $master);
            $quotation->adjustments()->create($snapshot);
            $totals['total_adjustments'] += (float) $snapshot['amount'];
            if ((float) $snapshot['amount'] < 0 || (bool) $snapshot['is_taxable']) {
                $taxableAdjustmentTotal += (float) $snapshot['amount'];
            }
        }

        $subtotal = (float) $totals['subtotal_after_discount'];
        $taxFactor = $subtotal > 0
            ? max($subtotal + $taxableAdjustmentTotal, 0) / $subtotal
            : 0;

        if (abs($taxFactor - 1) > 0.000001) {
            $totals['total_tax'] = 0;
            $taxUpdates = [];

            foreach ($quotation->items()->get() as $item) {
                $taxAmount = round((float) $item->tax_amount * $taxFactor, 2);
                $lineTotal = (float) $item->line_total;

                if ($quotation->pricing_mode === 'exclusive_gst') {
                    $lineTotal = round((float) $item->taxable_amount + $taxAmount, 2);
                }

                $taxUpdates[] = [
                    'id' => $item->id,
                    'tax_amount' => $taxAmount,
                    'line_total' => $lineTotal,
                ];
                $totals['total_tax'] += $taxAmount;
            }

            if ($taxUpdates !== []) {
                $this->updateItemTaxTotals($quotation, $taxUpdates);
            }
        }

        $totals['grand_total'] = round($quotation->pricing_mode === 'inclusive_gst'
            ? $subtotal + $totals['total_adjustments']
            : $subtotal + $totals['total_tax'] + $totals['total_adjustments'], 2);

        foreach ($terms as $term) {
            $masterId = (int) ($term['term_master_id'] ?? 0);
            $master = $masterId > 0
                ? ($termMasters->get($masterId) ?? TermMaster::findOrFail($masterId))
                : null;
            $quotation->terms()->create($this->buildTermSnapshot($term, $master));
        }

        $quotation->update($totals);
    }

    private function updateItemTaxTotals(Quotation $quotation, array $updates): void
    {
        // These rows already exist. An upsert attempts an incomplete INSERT and
        // fails required-column validation on MySQL before resolving duplicate IDs.
        foreach (array_chunk($updates, 100) as $chunk) {
            $assignments = [];
            $bindings = [];

            foreach (['tax_amount', 'line_total'] as $column) {
                $cases = [];
                foreach ($chunk as $row) {
                    $cases[] = 'WHEN ? THEN ?';
                    $bindings[] = $row['id'];
                    $bindings[] = $row[$column];
                }
                $assignments[] = $column.' = CASE id '.implode(' ', $cases).' ELSE '.$column.' END';
            }

            $assignments[] = 'updated_at = ?';
            $bindings[] = $quotation->freshTimestampString();
            $bindings[] = $quotation->id;
            $ids = array_column($chunk, 'id');
            array_push($bindings, ...$ids);
            $placeholders = implode(', ', array_fill(0, count($ids), '?'));

            $quotation->getConnection()->update(
                'UPDATE quotation_items SET '.implode(', ', $assignments)
                    .' WHERE quotation_id = ? AND id IN ('.$placeholders.')',
                $bindings,
            );
        }
    }

    private function recordDiscountOverride($quotationItem, array $snapshot, Quotation $quotation): void
    {
        $hasDiscount = (float) $snapshot['discount_percent'] > 0 || (float) $snapshot['discount_amount'] > 0;
        $hasEditedPrice = (float) $snapshot['edited_price'] !== (float) $snapshot['base_price'];

        if (! $hasDiscount && ! $hasEditedPrice) {
            return;
        }

        $overrideData = Arr::only([
            'discount_percent' => $snapshot['discount_percent'],
            'discount_amount' => $snapshot['discount_amount'],
            'reason' => $hasEditedPrice ? 'Edited price / discount captured during quotation save.' : 'Discount captured during quotation save.',
            'created_by' => $quotation->created_by,
        ], $this->getDiscountOverrideColumns());

        if ($overrideData === []) {
            return;
        }

        $quotationItem->discountOverrides()->create($overrideData);
    }

    private function getDiscountOverrideColumns(): array
    {
        if (! Schema::hasTable('quotation_item_discount_overrides')) {
            return [];
        }

        return $this->discountOverrideColumns ??= Schema::getColumnListing('quotation_item_discount_overrides');
    }

    private function listRelations(): array
    {
        return [
            'customer' => fn ($query) => $query->select($this->customerColumns()),
            'lead',
            'brandBanner',
            'items.product.measurementUnit',
            'items.fulfillment',
            'adjustments',
            'terms',
        ];
    }

    private function detailRelations(): array
    {
        return [
            'customer' => fn ($query) => $query->select($this->customerColumns()),
            'lead',
            'brandBanner',
            'items.product.measurementUnit',
            'items.fulfillment',
            Schema::hasTable('quotation_item_discount_overrides') ? 'items.discountOverrides' : 'items',
            'adjustments',
            'terms',
        ];
    }

    private function customerColumns(): array
    {
        if (self::$customerColumns === null) {
            self::$customerColumns = Schema::hasTable('customers')
                ? Schema::getColumnListing('customers')
                : ['*'];
        }

        return self::$customerColumns;
    }

    private function resolveCustomerFromLead(array $data): array
    {
        $leadId = $data['lead_id'] ?? null;

        if (! $leadId) {
            $data['lead_id'] = null;

            return $data;
        }

        Lead::query()->findOrFail($leadId);
        $data['lead_id'] = (int) $leadId;
        $data['customer_id'] = null;

        return $data;
    }

    private function buildAdjustmentSnapshot(
        array $input,
        float $subtotalAfterDiscount,
        ?AdjustmentMaster $master = null
    ): array
    {
        if (empty($input['adjustment_master_id'])) {
            $name = trim((string) ($input['name'] ?? ''));
            $amount = round((float) ($input['value'] ?? 0), 2);

            return [
                'adjustment_master_id' => null,
                'name' => $name,
                'code' => 'CUSTOM',
                'adjustment_type' => $amount < 0 ? 'discount' : 'charge',
                'value_type' => 'fixed',
                'value' => $amount,
                'amount' => $amount,
                'is_taxable' => true,
                'display_order' => (int) ($input['display_order'] ?? 0),
            ];
        }

        $master ??= AdjustmentMaster::findOrFail($input['adjustment_master_id']);
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

    private function buildTermSnapshot(array $input, ?TermMaster $term = null): array
    {
        if (empty($input['term_master_id'])) {
            return [
                'term_master_id' => null,
                'title' => trim((string) ($input['title'] ?? 'Additional Term')),
                'content' => trim((string) ($input['content'] ?? '')),
                'display_order' => (int) ($input['display_order'] ?? 0),
            ];
        }

        $term ??= TermMaster::findOrFail($input['term_master_id']);

        return [
            'term_master_id' => $term->id,
            'title' => $term->title,
            'content' => $term->content,
            'display_order' => (int) ($input['display_order'] ?? $term->display_order ?? 0),
        ];
    }

    private function nextQuotationNumber(): string
    {
        $setting = QuotationNumberSetting::query()->lockForUpdate()->firstOrNew(['id' => 1]);
        $prefix = $this->quotationNumberPrefix();
        $padding = 3;
        $suffixStart = strlen($prefix) + 1;
        $lastUsedSequence = (int) Quotation::query()
            ->where('quotation_number', 'like', $prefix.'%')
            ->selectRaw('MAX(CAST(SUBSTRING(quotation_number, ?) AS UNSIGNED)) as max_sequence', [$suffixStart])
            ->value('max_sequence');
        $next = max((int) ($setting->current_sequence ?? 1), $lastUsedSequence + 1, 1);

        $setting->forceFill([
            'prefix' => $prefix,
            'current_sequence' => $next + 1,
        ])->save();

        return $prefix.str_pad((string) $next, $padding, '0', STR_PAD_LEFT);
    }

    private function quotationNumberPrefix(): string
    {
        $today = Carbon::today();
        $financialYearStart = $today->month >= 4 ? $today->year : $today->year - 1;

        return sprintf('R3M/%02d/%02d/', $financialYearStart % 100, $today->month);
    }
}
