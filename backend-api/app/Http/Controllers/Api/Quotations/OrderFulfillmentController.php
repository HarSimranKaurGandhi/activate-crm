<?php

namespace App\Http\Controllers\Api\Quotations;

use App\Http\Controllers\Api\ApiController;
use App\Models\OrderFulfillment;
use App\Services\QuotationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OrderFulfillmentController extends ApiController
{
    public function bulkUpdate(Request $request, int $id, QuotationService $quotations): JsonResponse
    {
        abort_if($request->user()->hasAnyRole(['influencer']), 403);
        $data = $request->validate([
            'item_ids' => ['required', 'array', 'min:1'],
            'item_ids.*' => ['required', 'integer', 'distinct'],
            'stock_status' => ['sometimes', 'nullable', Rule::in(OrderFulfillment::STATUSES)],
            'stock_comment' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);
        $updates = array_intersect_key($data, array_flip(['stock_status', 'stock_comment']));
        if ($updates === []) {
            throw ValidationException::withMessages(['stock_status' => 'Choose a status or a common comment to apply.']);
        }

        return DB::transaction(function () use ($id, $quotations, $data, $updates) {
            $quotation = $quotations->find($id);
            Gate::authorize('view', $quotation);
            $quotation = $quotation->newQuery()->lockForUpdate()->findOrFail($id);
            if ($quotation->status !== 'locked') {
                throw ValidationException::withMessages(['status' => 'Stock can only be updated for locked quotations.']);
            }
            $items = $quotation->items()->whereKey($data['item_ids'])->get();
            if ($items->count() !== count($data['item_ids'])) {
                throw ValidationException::withMessages(['item_ids' => 'Every selected item must belong to this quotation.']);
            }
            $saved = $items->map(function ($item) use ($updates) {
                $fulfillment = $item->fulfillment()->updateOrCreate([], $updates);
                return [
                    'item_id' => $item->id,
                    'fulfillment' => $fulfillment->only(['stock_status', 'stock_comment']),
                ];
            });

            return $this->ok('Stock details updated for selected items', [
                'items' => $saved,
                'stock_progress_percent' => $quotation->stockProgressPercent(),
            ]);
        });
    }

    public function update(Request $request, int $id, int $itemId, QuotationService $quotations): JsonResponse
    {
        abort_if($request->user()->hasAnyRole(['influencer']), 403);
        $data = $request->validate([
            'stock_status' => ['present', 'nullable', Rule::in(OrderFulfillment::STATUSES)],
            'stock_comment' => ['present', 'nullable', 'string', 'max:2000'],
        ]);

        return DB::transaction(function () use ($request, $id, $itemId, $quotations, $data) {
            $quotation = $quotations->find($id);
            Gate::authorize('view', $quotation);
            $quotation = $quotation->newQuery()->lockForUpdate()->findOrFail($id);
            if ($quotation->status !== 'locked') {
                throw ValidationException::withMessages(['status' => 'Stock can only be updated for locked quotations.']);
            }
            $item = $quotation->items()->whereKey($itemId)->firstOrFail();
            $fulfillment = $item->fulfillment()->updateOrCreate([], $data);

            return $this->ok('Stock details saved', [
                'item_id' => $item->id,
                'fulfillment' => $fulfillment->only(['stock_status', 'stock_comment']),
                'stock_progress_percent' => $quotation->stockProgressPercent(),
            ]);
        });
    }
}
