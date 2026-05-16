<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class CategoryService extends MasterService
{
    protected string $modelClass = Category::class;

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
            ->select(['id', 'name', 'hsn_code', 'gst_percent'])
            ->orderBy('display_order')
            ->orderBy('name')
            ->get();
    }

    public function create(array $data): Model
    {
        $data['is_active'] = $data['is_active'] ?? true;
        $data['gst_percent'] = $data['gst_percent'] ?? 18;
        $data['display_order'] = $data['display_order'] ?? 0;

        return Category::create($data);
    }

    public function update(Model $model, array $data): Model
    {
        $model->update($data);

        if (array_key_exists('gst_percent', $data)) {
            Product::query()
                ->where('category_id', $model->getKey())
                ->update(['gst_percent' => $model->gst_percent]);
        }

        if (array_key_exists('hsn_code', $data)) {
            Product::query()
                ->where('category_id', $model->getKey())
                ->update(['hsn_code' => $model->hsn_code]);
        }

        return $model->refresh();
    }
}
