<?php

namespace App\Services;

use App\Models\CustomerFieldDefinition;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class CustomerFieldService extends MasterService
{
    protected string $modelClass = CustomerFieldDefinition::class;

    protected array $searchColumns = ['field_label', 'field_key'];

    public function paginate(Request $request): LengthAwarePaginator
    {
        return $this->query($request)
            ->orderBy('display_order')
            ->orderBy('field_label')
            ->paginate((int) $request->integer('per_page', 15));
    }

    public function create(array $data): Model
    {
        $data = $this->normalizeOptions($data);
        $data['is_required'] = $data['is_required'] ?? false;
        $data['is_active'] = $data['is_active'] ?? true;
        $data['display_order'] = $data['display_order'] ?? 0;

        return CustomerFieldDefinition::create($data);
    }

    public function update(Model $model, array $data): Model
    {
        $model->update($this->normalizeOptions($data));

        return $model->refresh();
    }

    private function normalizeOptions(array $data): array
    {
        if (($data['field_type'] ?? null) !== 'dropdown') {
            $data['options_json'] = $data['options_json'] ?? null;
        }

        if (isset($data['options_json']) && is_array($data['options_json'])) {
            $data['options_json'] = array_values(array_filter($data['options_json'], fn ($option) => $option !== null && $option !== ''));
        }

        return $data;
    }
}
