<?php

namespace App\Services;

use App\Models\Brand;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class BrandService extends MasterService
{
    protected string $modelClass = Brand::class;

    protected array $searchColumns = ['name'];

    public function paginate(Request $request): LengthAwarePaginator
    {
        return $this->query($request)
            ->orderBy('display_order')
            ->orderBy('name')
            ->paginate((int) $request->integer('per_page', 15));
    }

    public function dropdown(Request $request): Collection
    {
        return $this->query($request)
            ->where('is_active', true)
            ->select(['id', 'name'])
            ->orderBy('display_order')
            ->orderBy('name')
            ->get();
    }

    public function create(array $data): Model
    {
        $data['is_active'] = $data['is_active'] ?? true;
        $data['display_order'] = $data['display_order'] ?? 0;
        $data = $this->normalizeData($data);

        return Brand::create($data);
    }

    public function update(Model $model, array $data): Model
    {
        $data = $this->normalizeData($data, $model);
        $model->update($data);

        return $model->refresh();
    }

    private function normalizeData(array $data, ?Brand $brand = null): array
    {
        $payload = [
            'name' => $data['name'],
            'brand_owner' => $data['supplier_name'] ?? null,
            'description' => $data['description'] ?? null,
            'display_order' => $data['display_order'] ?? 0,
            'is_active' => $data['is_active'] ?? true,
        ];

        if (($data['brand_logo'] ?? null) instanceof UploadedFile) {
            if ($brand?->logo) {
                Storage::disk('public')->delete($brand->logo);
            }

            $payload['logo'] = $data['brand_logo']->store('brands/logos', 'public');
        }

        if (($data['brand_catalog'] ?? null) instanceof UploadedFile) {
            if ($brand?->catalog_path) {
                Storage::disk('public')->delete($brand->catalog_path);
            }

            $payload['catalog_path'] = $data['brand_catalog']->store('brands/catalogs', 'public');
        }

        return $payload;
    }
}
