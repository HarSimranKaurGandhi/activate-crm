<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Brand;
use App\Models\MeasurementUnit;
use App\Models\Product;
use App\Models\ProductImage;
use App\Support\PublicAsset;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\UploadedFile;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class ProductService extends CrudService
{
    protected string $modelClass = Product::class;

    protected array $searchColumns = [];

    protected array $relations = ['category', 'brand', 'images'];

    public function paginate(Request $request): LengthAwarePaginator
    {
        $query = $this->query($request);

        $this->applySorting($query, $request, [
            'id' => 'products.id',
            'product_name' => 'products.product_name',
            'model_number' => 'products.model_number',
            'category' => 'categories.name',
            'brand' => 'brands.name',
            'mrp' => 'products.mrp',
            'usual_selling_price' => 'products.usual_selling_price',
            'least_selling_price' => 'products.least_selling_price',
            'gst_percent' => 'products.gst_percent',
        ], 'products.id', 'desc');

        return $query
            ->paginate((int) $request->integer('per_page', 15));
    }

    public function selectable(Request $request): LengthAwarePaginator
    {
        return Product::query()
            ->with(['brand', 'measurementUnit'])
            ->when($request->filled('search'), function (Builder $query) use ($request): void {
                $search = $request->string('search')->toString();
                $query->where(function (Builder $builder) use ($search): void {
                    $builder
                        ->where('product_name', 'like', "%{$search}%")
                        ->orWhere('model_number', 'like', "%{$search}%")
                        ->orWhereHas('brand', fn (Builder $brandQuery) => $brandQuery->where('name', 'like', "%{$search}%"));
                });
            })
            ->when($request->filled('category_id'), fn (Builder $q) => $q->where('category_id', $request->integer('category_id')))
            ->when($request->filled('brand_id'), fn (Builder $q) => $q->where('brand_id', $request->integer('brand_id')))
            ->when($request->filled('gst_percent'), fn (Builder $q) => $q->where('gst_percent', $request->input('gst_percent')))
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
                'least_selling_price',
                'gst_percent',
                'brand_id',
                'category_id',
                'unit',
                'hsn_code',
                'specifications',
            ])
            ->orderBy('product_name')
            ->paginate((int) $request->integer('per_page', 15));
    }

    public function create(array $data): Product
    {
        return DB::transaction(function () use ($data): Product {
            $imageFiles = $data['product_images'] ?? [];
            $primaryToken = $data['primary_image_token'] ?? null;
            unset($data['product_images'], $data['primary_image_token'], $data['keep_existing_image_ids']);

            $data = $this->applyCategoryAttributes($data);
            $data['is_active'] = $data['is_active'] ?? true;
            $data['unit'] = $this->normalizeMeasurementUnitCode($data['unit'] ?? 'NOS');

            $product = Product::create($data);
            $this->syncImages($product, $this->normalizeUploadFiles($imageFiles), $primaryToken);

            return $product->load($this->relations);
        });
    }

    public function update($model, array $data): Product
    {
        return DB::transaction(function () use ($model, $data): Product {
            $imageFiles = $data['product_images'] ?? [];
            $primaryToken = $data['primary_image_token'] ?? null;
            $keepExistingImageIds = collect($data['keep_existing_image_ids'] ?? [])
                ->map(fn ($id) => (int) $id)
                ->filter()
                ->values()
                ->all();
            unset($data['product_images'], $data['primary_image_token'], $data['keep_existing_image_ids']);

            $data = $this->applyCategoryAttributes($data, $model);
            if (array_key_exists('unit', $data)) {
                $data['unit'] = $this->normalizeMeasurementUnitCode($data['unit']);
            }
            $model->update($data);
            $this->syncImages($model, $this->normalizeUploadFiles($imageFiles), $primaryToken, $keepExistingImageIds);

            return $model->refresh()->load($this->relations);
        });
    }

    public function toggleStatus($model, bool $isActive): Product
    {
        $model->update(['is_active' => $isActive]);

        return $model->refresh()->load($this->relations);
    }

    public function delete($model): void
    {
        DB::transaction(function () use ($model): void {
            $model->images()->get()->each(function (ProductImage $image): void {
                PublicAsset::delete($image->image_path);
                $image->delete();
            });

            PublicAsset::delete($model->image_path);
            PublicAsset::delete($model->brochure_path);
            $model->delete();
        });
    }

    protected function applyFilters(Builder $query, Request $request): Builder
    {
        return $query
            ->select('products.*')
            ->leftJoin('categories', 'categories.id', '=', 'products.category_id')
            ->leftJoin('brands', 'brands.id', '=', 'products.brand_id')
            ->when($request->filled('search'), function (Builder $q) use ($request): void {
                $search = $request->string('search')->toString();
                $q->where(function (Builder $builder) use ($search): void {
                    $builder
                        ->where('products.product_name', 'like', "%{$search}%")
                        ->orWhere('products.model_number', 'like', "%{$search}%")
                        ->orWhere('products.hsn_code', 'like', "%{$search}%")
                        ->orWhere('categories.name', 'like', "%{$search}%")
                        ->orWhere('brands.name', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('category_id'), fn (Builder $q) => $q->where('products.category_id', $request->integer('category_id')))
            ->when($request->filled('brand_id'), fn (Builder $q) => $q->where('products.brand_id', $request->integer('brand_id')))
            ->when($request->filled('gst_percent'), fn (Builder $q) => $q->where('products.gst_percent', $request->input('gst_percent')));
    }

    private function applySorting(
        Builder $query,
        Request $request,
        array $columns,
        string $defaultColumn,
        string $defaultDirection = 'asc'
    ): void {
        $sortBy = $request->string('sort_by', '')->toString();
        $column = $columns[$sortBy] ?? $defaultColumn;
        $direction = $request->string('sort_direction', $defaultDirection)->toString() === 'asc' ? 'asc' : 'desc';

        $query->orderBy($column, $direction);

        if ($column !== 'products.id') {
            $query->orderBy('products.id', 'desc');
        }
    }

    public function bulkUpsertFromCsv(string $path): array
    {
        $handle = fopen($path, 'r');

        if (! $handle) {
            throw ValidationException::withMessages([
                'file' => ['Unable to read the uploaded CSV file.'],
            ]);
        }

        $header = fgetcsv($handle);

        if (! is_array($header)) {
            fclose($handle);
            throw ValidationException::withMessages([
                'file' => ['The uploaded CSV file is empty.'],
            ]);
        }

        $header = array_map(fn ($value) => strtolower(trim((string) $value)), $header);
        $created = 0;
        $updated = 0;
        $rowNumber = 1;

        DB::transaction(function () use ($handle, $header, &$created, &$updated, &$rowNumber): void {
            while (($row = fgetcsv($handle)) !== false) {
                $rowNumber++;

                if ($row === [null] || count(array_filter($row, fn ($value) => trim((string) $value) !== '')) === 0) {
                    continue;
                }

                $payload = array_combine($header, array_pad($row, count($header), null));

                if (! is_array($payload)) {
                    throw ValidationException::withMessages([
                        'file' => ["Invalid CSV structure on row {$rowNumber}."],
                    ]);
                }

                $categoryName = trim((string) ($payload['category_name'] ?? ''));
                $brandName = trim((string) ($payload['brand_name'] ?? ''));

                $category = Category::query()
                    ->whereRaw('LOWER(TRIM(name)) = ?', [strtolower($categoryName)])
                    ->first();

                $brand = Brand::query()
                    ->whereRaw('LOWER(TRIM(name)) = ?', [strtolower($brandName)])
                    ->first();

                if (! $category) {
                    throw ValidationException::withMessages([
                        'file' => ["Category '{$categoryName}' not found on row {$rowNumber}."],
                    ]);
                }

                if (! $brand) {
                    throw ValidationException::withMessages([
                        'file' => ["Brand '{$brandName}' not found on row {$rowNumber}."],
                    ]);
                }

                $productData = $this->applyCategoryAttributes([
                    'product_name' => trim((string) ($payload['product_name'] ?? '')),
                    'model_number' => trim((string) ($payload['model_number'] ?? '')),
                    'category_id' => $category->id,
                    'brand_id' => $brand->id,
                    'unit' => $this->normalizeMeasurementUnitCode($payload['unit'] ?? 'NOS'),
                    'mrp' => (float) ($payload['mrp'] ?? 0),
                    'usual_selling_price' => (float) ($payload['usual_selling_price'] ?? 0),
                    'least_selling_price' => (float) ($payload['least_selling_price'] ?? 0),
                    'specifications' => (string) ($payload['specifications'] ?? ''),
                    'is_active' => in_array(strtolower(trim((string) ($payload['status'] ?? 'active'))), ['1', 'true', 'active', 'yes'], true),
                ]);

                if ($productData['product_name'] === '' || $productData['model_number'] === '') {
                    throw ValidationException::withMessages([
                        'file' => ["Product name and model number are required on row {$rowNumber}."],
                    ]);
                }

                $product = Product::query()->where('model_number', $productData['model_number'])->first();

                if ($product) {
                    $product->update($productData);
                    $updated++;
                } else {
                    Product::create($productData);
                    $created++;
                }
            }
        });

        fclose($handle);

        return [
            'created' => $created,
            'updated' => $updated,
            'total' => $created + $updated,
        ];
    }

    public function sampleCsv(): string
    {
        return implode("\n", [
            'product_name,model_number,category_name,brand_name,mrp,usual_selling_price,least_selling_price,unit,status,specifications',
            '"Commercial Treadmill","TM-1000","Cardio","Life Fitness","150000","135000","125000","Nos","active","<ul><li>AC motor</li><li>15 incline levels</li></ul>"',
            '"Spin Bike","SB-220","Cycling","Matrix","45000","39999","37500","Nos","active","<p>Heavy-duty flywheel with adjustable resistance.</p>"',
        ]);
    }

    private function applyCategoryAttributes(array $data, ?Product $product = null): array
    {
        $categoryId = $data['category_id'] ?? $product?->category_id;

        $category = Category::query()->findOrFail($categoryId);

        $data['gst_percent'] = (string) $category->gst_percent;
        $data['hsn_code'] = $category->hsn_code;

        return $data;
    }

    /**
     * @param  array<int, UploadedFile>  $imageFiles
     */
    private function syncImages(Product $product, array $imageFiles, ?string $primaryToken, ?array $keepExistingImageIds = null): void
    {
        if (is_array($keepExistingImageIds)) {
            $product->images()
                ->whereNotIn('id', $keepExistingImageIds)
                ->get()
                ->each(function (ProductImage $image): void {
                    PublicAsset::delete($image->image_path);
                    $image->delete();
                });
        }

        $createdImages = collect();

        foreach ($imageFiles as $index => $imageFile) {
            $storedPath = PublicAsset::store($imageFile, 'uploads/products/images');
            $createdImages->push($product->images()->create([
                'image_path' => $storedPath,
                'is_primary' => false,
                'display_order' => $product->images()->count() + $index,
            ]));
        }

        $allImages = $product->images()->orderBy('display_order')->orderBy('id')->get()->values();

        if ($allImages->isEmpty()) {
            $product->update(['image_path' => null]);
            return;
        }

        $primaryImage = $this->resolvePrimaryImage($allImages, $createdImages, $primaryToken) ?? $allImages->first();

        ProductImage::query()
            ->where('product_id', $product->getKey())
            ->update(['is_primary' => false]);

        $primaryImage->update(['is_primary' => true]);
        $allImages->values()->each(function (ProductImage $image, int $index) use ($primaryImage): void {
            $image->update([
                'display_order' => $index,
                'is_primary' => $image->is($primaryImage),
            ]);
        });
        $product->update(['image_path' => $primaryImage->image_path]);
    }

    /**
     * @param  array<int, UploadedFile>  $imageFiles
     * @return array<int, UploadedFile>
     */
    private function normalizeUploadFiles(mixed $imageFiles): array
    {
        if ($imageFiles instanceof UploadedFile) {
            return [$imageFiles];
        }

        if (! is_array($imageFiles)) {
            return [];
        }

        return array_values(array_filter($imageFiles, fn ($file) => $file instanceof UploadedFile));
    }

    private function resolvePrimaryImage(Collection $allImages, Collection $createdImages, ?string $primaryToken): ?ProductImage
    {
        if (! $primaryToken) {
            return $allImages->firstWhere('is_primary', true);
        }

        if (str_starts_with($primaryToken, 'existing:')) {
            $id = (int) substr($primaryToken, strlen('existing:'));
            return $allImages->firstWhere('id', $id);
        }

        if (str_starts_with($primaryToken, 'new:')) {
            $index = (int) substr($primaryToken, strlen('new:'));
            return $createdImages->values()->get($index);
        }

        return null;
    }

    private function normalizeMeasurementUnitCode(mixed $value): string
    {
        $code = strtoupper(trim((string) $value));

        if ($code === '') {
            $code = 'NOS';
        }

        if (! MeasurementUnit::query()->where('code', $code)->where('is_active', true)->exists()) {
            throw ValidationException::withMessages([
                'unit' => ['The selected measurement unit is invalid.'],
            ]);
        }

        return $code;
    }
}
