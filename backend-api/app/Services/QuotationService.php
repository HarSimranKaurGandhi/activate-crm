<?php

namespace App\Services;

use App\Models\AdjustmentMaster;
use App\Models\CompanyBankDetail;
use App\Models\CompanySetting;
use App\Models\Customer;
use App\Models\Lead;
use App\Models\Quotation;
use App\Models\QuotationNumberSetting;
use App\Models\TermMaster;
use App\Models\User;
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

    protected array $relations = ['customer', 'items', 'adjustments', 'terms'];

    private ?array $discountOverrideColumns = null;

    private static ?array $customerColumns = null;

    private ?bool $supportsShowMrpColumn = null;

    private ?bool $supportsShowItemWiseGstColumn = null;

    private ?bool $supportsRoundOffNetAmountColumn = null;

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
            $data = $this->sanitizeForCurrentSchema($data);

            $quotation = Quotation::create($data);
            $this->syncLines($quotation, $items, $adjustments, $terms);

            return $quotation->refresh()->load($this->detailRelations());
        });
    }

    public function update($model, array $data): Quotation
    {
        return DB::transaction(function () use ($model, $data): Quotation {
            $items = $data['items'] ?? null;
            $adjustments = $data['adjustments'] ?? null;
            $terms = $data['terms'] ?? null;
            unset($data['items'], $data['adjustments'], $data['terms']);
            $data = $this->resolveCustomerFromLead($data);
            $data['show_mrp_to_customer'] = $data['show_mrp_to_customer'] ?? true;
            $data['show_item_wise_gst_to_customer'] = $data['show_item_wise_gst_to_customer'] ?? false;
            $data['round_off_net_amount_to_customer'] = $data['round_off_net_amount_to_customer'] ?? false;
            $data = $this->sanitizeForCurrentSchema($data);

            $model->update($data);

            if (is_array($items)) {
                $model->items->each(fn ($item) => $item->discountOverrides()->delete());
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
            $model->items->each(fn ($item) => $item->discountOverrides()->delete());
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

    private function visibleQuery(Request $request): Builder
    {
        $query = Quotation::query();
        $user = $request->user();

        if (! $user instanceof User) {
            return $query;
        }

        $user->loadMissing('role');

        if ($user->hasAnyRole(['admin', 'operations'])) {
            return $query;
        }

        return $query->where('created_by', $user->getKey());
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
            'items',
            'adjustments',
            'terms',
        ];
    }

    private function detailRelations(): array
    {
        return [
            'customer' => fn ($query) => $query->select($this->customerColumns()),
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
            unset($data['lead_id']);

            return $data;
        }

        /** @var Lead $lead */
        $lead = Lead::query()->findOrFail($leadId);

        $customer = Customer::query()
            ->where('phone', $lead->phone)
            ->when(
                filled($lead->email),
                fn (Builder $query) => $query->orWhere('email', $lead->email)
            )
            ->first();

        if (! $customer) {
            $customer = Customer::create([
                'primary_name' => $lead->name ?: "Lead {$lead->phone}",
                'company_name' => null,
                'email' => $lead->email,
                'phone' => $lead->phone,
                'address_line_1' => $lead->address_line_1 ?: 'N/A',
                'address_line_2' => $lead->address_line_2,
                'city' => $lead->city,
                'state' => $lead->state ?: 'N/A',
                'pincode' => $lead->pincode,
                'country' => $lead->country ?: 'India',
                'notes' => $lead->requirement ?: null,
                'is_active' => true,
            ]);
        }

        $data['customer_id'] = $customer->id;
        unset($data['lead_id']);

        return $data;
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
        $prefix = in_array('prefix', $columns, true) ? ($setting->prefix ?: 'QT-') : 'QT-';
        $padding = 5;
        $next = in_array('current_sequence', $columns, true) ? max((int) ($setting->current_sequence ?: 1), 1) : 1;

        while (Quotation::query()->where('quotation_number', $prefix.str_pad((string) $next, $padding, '0', STR_PAD_LEFT))->exists()) {
            $next++;
        }

        $attributes = [];

        if (in_array('prefix', $columns, true)) {
            $attributes['prefix'] = $prefix;
        }

        if (in_array('current_sequence', $columns, true)) {
            $attributes['current_sequence'] = $next + 1;
        }

        if ($attributes !== []) {
            $setting->fill(Arr::only($attributes, $columns));
            $setting->save();
        }

        return $prefix.str_pad((string) $next, $padding, '0', STR_PAD_LEFT);
    }
}
