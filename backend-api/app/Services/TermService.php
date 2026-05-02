<?php

namespace App\Services;

use App\Models\TermMaster;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TermService extends MasterService
{
    protected string $modelClass = TermMaster::class;

    protected array $searchColumns = ['title'];

    public function paginate(Request $request): LengthAwarePaginator
    {
        return $this->query($request)
            ->orderBy('display_order')
            ->orderBy('title')
            ->paginate((int) $request->integer('per_page', 15));
    }

    public function active(Request $request): Collection
    {
        return $this->query($request)
            ->where('is_active', true)
            ->orderBy('display_order')
            ->orderBy('title')
            ->get();
    }

    public function create(array $data): Model
    {
        $data['is_default'] = $data['is_default'] ?? false;
        $data['is_active'] = $data['is_active'] ?? true;
        $data['display_order'] = $data['display_order'] ?? 0;

        return TermMaster::create($data);
    }

    public function reorder(array $items): void
    {
        DB::transaction(function () use ($items): void {
            foreach ($items as $item) {
                TermMaster::whereKey($item['id'])->update([
                    'display_order' => $item['display_order'],
                ]);
            }
        });
    }
}
