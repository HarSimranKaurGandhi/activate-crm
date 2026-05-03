<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class ProductService extends CrudService
{
    protected string $modelClass = Product::class;

    protected array $searchColumns = ['product_name', 'model_number'];

    protected array $relations = ['category', 'brand'];

    public function paginate(Request $request): LengthAwarePaginator
    {
        return $this->query($request)
            ->latest('id')
            ->paginate((int) $request->integer('per_page', 15));
    }

    public function selectable(Request $request): LengthAwarePaginator
    {
        return Product::query()
            ->when($request->filled('search'), function (Builder $query) use ($request): void {
                $search = $request->string('search')->toString();
                $query->where(function (Builder $builder) use ($search): void {
                    $builder
                        ->where('product_name', 'like', "%{$search}%")
                        ->orWhere('model_number', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('category_id'), fn (Builder $q) => $q->where('category_id', $request->integer('category_id')))
            ->when($request->filled('brand_id'), fn (Builder $q) => $q->where('brand_id', $request->integer('brand_id')))
            ->when(
                $request->has('is_active'),
                fn (Builder $q) => $q->where('is_active', $request->boolean('is_active')),
                fn (Builder $q) => $q->where('is_active', true)
            )
            ->select([
                'id',
                'product_name',
                'model_number',
                'image_path',
                'mrp',
                'usual_selling_price',
                'gst_percent',
            ])
            ->orderBy('product_name')
            ->paginate((int) $request->integer('per_page', 15));
    }

    public function create(array $data): Product
    {
        $data['is_active'] = $data['is_active'] ?? true;
        $data['unit'] = $request->unit ?? '1';
        return Product::create($data)->load($this->relations);
    }

    public function update($model, array $data): Product
    {
        $model->update($data);

        return $model->refresh()->load($this->relations);
    }

    public function toggleStatus($model, bool $isActive): Product
    {
        $model->update(['is_active' => $isActive]);

        return $model->refresh()->load($this->relations);
    }

    protected function applyFilters(Builder $query, Request $request): Builder
    {
        return $query
            ->when($request->filled('category_id'), fn (Builder $q) => $q->where('category_id', $request->integer('category_id')))
            ->when($request->filled('brand_id'), fn (Builder $q) => $q->where('brand_id', $request->integer('brand_id')));
    }
}
