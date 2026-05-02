<?php

namespace App\Services;

use App\Models\AdjustmentMaster;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdjustmentService extends MasterService
{
    protected string $modelClass = AdjustmentMaster::class;

    protected array $searchColumns = ['name'];

    public function paginate(Request $request): LengthAwarePaginator
    {
        return $this->query($request)
            ->orderBy('display_order')
            ->orderBy('name')
            ->paginate((int) $request->integer('per_page', 15));
    }

    public function active(Request $request): Collection
    {
        return $this->query($request)
            ->where('is_active', true)
            ->orderBy('display_order')
            ->orderBy('name')
            ->get();
    }

    public function create(array $data): Model
    {
        $data['is_taxable'] = $data['is_taxable'] ?? false;
        $data['is_optional'] = $data['is_optional'] ?? true;
        $data['is_editable'] = $data['is_editable'] ?? true;
        $data['is_active'] = $data['is_active'] ?? true;
        $data['display_order'] = $data['display_order'] ?? 0;

        return AdjustmentMaster::create($data);
    }

    public function reorder(array $items): void
    {
        DB::transaction(function () use ($items): void {
            foreach ($items as $item) {
                AdjustmentMaster::whereKey($item['id'])->update([
                    'display_order' => $item['display_order'],
                ]);
            }
        });
    }
}
