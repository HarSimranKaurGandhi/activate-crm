<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\CustomerFieldDefinition;
use App\Models\CustomerOwnedProduct;
use App\Models\InventoryMovement;
use App\Models\Lead;
use App\Models\ActivityLog;
use App\Models\Quotation;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class CustomerService extends CrudService
{
    protected string $modelClass = Customer::class;

    protected array $searchColumns = ['primary_name', 'company_name', 'phone', 'email'];

    protected array $relations = ['fieldValues.definition'];

    public function paginate(Request $request): LengthAwarePaginator
    {
        return $this->query($request)
            ->latest('id')
            ->paginate((int) $request->integer('per_page', 15));
    }

    public function create(array $data): Customer
    {
        return DB::transaction(function () use ($data): Customer {
            $customFields = $data['custom_fields'] ?? [];
            unset($data['custom_fields']);

            $data['is_active'] = $data['is_active'] ?? true;
            $this->validateCustomFields($customFields);

            $customer = Customer::create($data);
            $this->syncCustomFields($customer, $customFields);

            return $customer->load($this->relations);
        });
    }

    public function update($model, array $data): Customer
    {
        return DB::transaction(function () use ($model, $data): Customer {
            $customFields = $data['custom_fields'] ?? null;
            unset($data['custom_fields']);

            $model->update($data);

            if (is_array($customFields)) {
                $this->validateCustomFields($customFields, $model);
                $this->syncCustomFields($model, $customFields);
            }

            return $model->refresh()->load($this->relations);
        });
    }

    public function toggleStatus(Model $model, bool $isActive): Customer
    {
        $model->update(['is_active' => $isActive]);

        return $model->refresh()->load($this->relations);
    }

    public function delete(Model $model): void
    {
        if ($model->quotations()->exists()) {
            throw new HttpException(422, 'Cannot delete this customer because quotations exist for this customer.');
        }

        DB::transaction(function () use ($model): void {
            $model->fieldValues()->delete();
            $model->delete();
        });
    }

    public function quotationHistory(Customer $customer, Request $request): LengthAwarePaginator
    {
        return $customer->quotations()
            ->latest('id')
            ->paginate((int) $request->integer('per_page', 15));
    }

    public function overview(Customer $customer, ?User $viewer = null): array
    {
        $ownedProducts = $customer->ownedProducts()
            ->with(['product.brand:id,name', 'product.measurementUnit', 'sourceDispatch:id,dispatch_number'])
            ->latest('last_purchased_at')
            ->get()
            ->map(fn (CustomerOwnedProduct $owned): array => [
                'id' => $owned->id,
                'product_id' => $owned->product_id,
                'product_name' => $owned->product?->product_name ?: $owned->product_description,
                'product_description' => $owned->product_description,
                'model_number' => $owned->product?->model_number,
                'brand' => $owned->product?->brand?->name,
                'measurement_unit' => $owned->product?->measurementUnit?->name ?: $owned->product?->unit,
                'quantity' => (float) $owned->quantity,
                'first_purchased_at' => optional($owned->first_purchased_at)->toDateString(),
                'last_purchased_at' => optional($owned->last_purchased_at)->toDateString(),
                'dispatch_number' => $owned->sourceDispatch?->dispatch_number,
            ]);

        $timeline = collect();

        Quotation::query()
            ->where('customer_id', $customer->id)
            ->latest('quote_date')
            ->limit(100)
            ->get()
            ->each(function (Quotation $quotation) use ($timeline): void {
                $timeline->push([
                    'id' => "quotation-{$quotation->id}",
                    'type' => 'quotation',
                    'title' => "Quotation {$quotation->quotation_number}",
                    'description' => 'Quotation status: '.str_replace('_', ' ', $quotation->status).'.',
                    'amount' => (float) $quotation->grand_total,
                    'occurred_at' => optional($quotation->quote_date ?? $quotation->created_at)->toISOString(),
                ]);
            });

        InventoryMovement::query()
            ->with(['items.product:id,product_name'])
            ->where('customer_id', $customer->id)
            ->where('movement_type', 'out')
            ->whereNotNull('dispatch_id')
            ->latest('movement_date')
            ->limit(100)
            ->get()
            ->each(function (InventoryMovement $movement) use ($timeline): void {
                $products = $movement->items
                    ->map(fn ($item): string => ($item->product?->product_name ?? 'Product').' × '.(float) $item->quantity)
                    ->implode(', ');
                $timeline->push([
                    'id' => "purchase-{$movement->id}",
                    'type' => 'purchase',
                    'title' => 'Purchase dispatched',
                    'description' => $products,
                    'occurred_at' => optional($movement->movement_date)->toISOString(),
                ]);
            });

        $leadQuery = Lead::query()
            ->when(
                filled($customer->phone) || filled($customer->email),
                function (Builder $query) use ($customer): void {
                    $query->where(function (Builder $match) use ($customer): void {
                        if (filled($customer->phone)) {
                            $match->where('phone', $customer->phone);
                        }
                        if (filled($customer->email)) {
                            filled($customer->phone)
                                ? $match->orWhere('email', $customer->email)
                                : $match->where('email', $customer->email);
                        }
                    });
                },
                fn (Builder $query) => $query->whereRaw('1 = 0')
            );

        if ($viewer && ! $viewer->hasAnyRole(['admin'])) {
            $leadQuery->where('assigned_to', $viewer->id);
        }

        $leads = $leadQuery->latest('id')->limit(100)->get();
        $leads->each(function (Lead $lead) use ($timeline): void {
            $timeline->push([
                'id' => "enquiry-{$lead->id}",
                'type' => 'enquiry',
                'title' => 'Enquiry: '.($lead->name ?: 'Lead'),
                'description' => $lead->requirement ?: 'No requirement recorded.',
                'occurred_at' => optional($lead->created_at)->toISOString(),
            ]);
        });

        if ($leads->isNotEmpty()) {
            ActivityLog::query()
                ->where('module', 'leads')
                ->where('entity_type', 'lead')
                ->whereIn('entity_id', $leads->pluck('id'))
                ->latest('created_at')
                ->limit(150)
                ->get()
                ->each(function (ActivityLog $activity) use ($timeline): void {
                    $actor = $activity->new_values['actor']['name'] ?? null;
                    $timeline->push([
                        'id' => "activity-{$activity->id}",
                        'type' => 'activity',
                        'title' => ucfirst(str_replace('_', ' ', $activity->action)),
                        'description' => $activity->description ?: 'Lead activity recorded.',
                        'actor' => $actor,
                        'occurred_at' => optional($activity->created_at)->toISOString(),
                    ]);
                });
        }

        return [
            'owned_products' => $ownedProducts->values(),
            'timeline' => $timeline
                ->filter(fn (array $item): bool => filled($item['occurred_at'] ?? null))
                ->sortByDesc('occurred_at')
                ->take(200)
                ->values(),
        ];
    }

    public function addOwnedProduct(Customer $customer, array $data, ?User $actor): CustomerOwnedProduct
    {
        return DB::transaction(function () use ($customer, $data, $actor): CustomerOwnedProduct {
            $identity = ['customer_id' => $customer->id];
            if (! empty($data['product_id'])) {
                $identity['product_id'] = $data['product_id'];
            }

            $owned = ! empty($data['product_id'])
                ? CustomerOwnedProduct::query()->firstOrNew($identity)
                : new CustomerOwnedProduct(['customer_id' => $customer->id]);
            $owned->product_description = filled($data['product_description'] ?? null)
                ? trim($data['product_description'])
                : $owned->product_description;
            $owned->quantity = (float) ($owned->quantity ?? 0) + (float) $data['quantity'];
            $owned->created_by ??= $actor?->id;
            $owned->save();

            return $owned;
        });
    }

    public function removeOwnedProduct(Customer $customer, int|string $ownedProductId): void
    {
        $customer->ownedProducts()->whereKey($ownedProductId)->firstOrFail()->delete();
    }

    private function syncCustomFields(Customer $customer, array $customFields): void
    {
        foreach ($customFields as $field) {
            $definitionId = $this->resolveFieldDefinitionId($field);

            $customer->fieldValues()->updateOrCreate(
                ['field_definition_id' => $definitionId],
                ['field_value' => $this->normalizeValue($field['value'] ?? null)]
            );
        }
    }

    private function resolveFieldDefinitionId(array $field): int
    {
        if (! empty($field['field_definition_id'])) {
            return (int) $field['field_definition_id'];
        }

        return (int) CustomerFieldDefinition::where('field_key', $field['field_key'])->firstOrFail()->id;
    }

    private function normalizeValue(mixed $value): mixed
    {
        return is_array($value) ? json_encode($value) : $value;
    }

    private function validateCustomFields(array $customFields, ?Customer $customer = null): void
    {
        $provided = collect($customFields)
            ->mapWithKeys(function (array $field): array {
                $definitionId = $this->resolveFieldDefinitionId($field);

                return [$definitionId => $field['value'] ?? null];
            });

        if ($customer) {
            $existing = $customer->fieldValues()->pluck('field_value', 'field_definition_id');
            $provided = $existing->merge($provided);
        }

        $errors = [];

        foreach ($customFields as $index => $field) {
            $definition = CustomerFieldDefinition::findOrFail($this->resolveFieldDefinitionId($field));
            $value = $field['value'] ?? null;

            if (blank($value)) {
                continue;
            }

            $key = "custom_fields.{$index}.value";

            if (is_array($value) && $definition->field_type !== 'checkbox') {
                $errors[$key][] = "{$definition->field_label} must be a single value.";
                continue;
            }

            if ($definition->field_type === 'number' && ! is_numeric($value)) {
                $errors[$key][] = "{$definition->field_label} must be a number.";
            }

            if ($definition->field_type === 'email' && ! filter_var($value, FILTER_VALIDATE_EMAIL)) {
                $errors[$key][] = "{$definition->field_label} must be a valid email address.";
            }

            if ($definition->field_type === 'date' && strtotime((string) $value) === false) {
                $errors[$key][] = "{$definition->field_label} must be a valid date.";
            }

            if ($definition->field_type === 'phone' && ! preg_match('/^[0-9+\-\s()]{7,30}$/', (string) $value)) {
                $errors[$key][] = "{$definition->field_label} must be a valid phone number.";
            }

            if ($definition->field_type === 'dropdown' && ! in_array($value, $definition->options_json ?? [], true)) {
                $errors[$key][] = "{$definition->field_label} must be one of the configured options.";
            }
        }

        $missing = CustomerFieldDefinition::query()
            ->where('is_active', true)
            ->where('is_required', true)
            ->get()
            ->filter(fn (CustomerFieldDefinition $definition) => blank($provided->get($definition->id)))
            ->mapWithKeys(fn (CustomerFieldDefinition $definition) => [
                "custom_fields.{$definition->field_key}" => ["{$definition->field_label} is required."],
            ])
            ->all();

        $errors = array_merge($errors, $missing);

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }
}
