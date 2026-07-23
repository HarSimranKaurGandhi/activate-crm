<?php

namespace App\Http\Controllers\Api\Masters;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Masters\GodownRequest;
use App\Models\Godown;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GodownController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = Godown::query()->orderBy('name');
        if ($request->boolean('active_only')) $query->where('is_active', true);
        return $this->ok('Godowns fetched successfully', $query->get());
    }

    public function store(GodownRequest $request): JsonResponse
    {
        return $this->ok('Godown created successfully', Godown::create($request->validated()), [], 201);
    }

    public function update(GodownRequest $request, int|string $id): JsonResponse
    {
        $godown = Godown::findOrFail($id);
        $godown->update($request->validated());
        return $this->ok('Godown updated successfully', $godown->refresh());
    }

    public function destroy(int|string $id): JsonResponse
    {
        $godown = Godown::findOrFail($id);
        if (DB::table('inventory_movement_items')->where('godown_id', $godown->id)->exists()) {
            $godown->update(['is_active' => false]);
            return $this->ok('Godown has inventory history and was deactivated.');
        }
        $godown->delete();
        return $this->ok('Godown deleted successfully');
    }
}
