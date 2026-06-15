<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\CustomerFieldDefinition;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
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
