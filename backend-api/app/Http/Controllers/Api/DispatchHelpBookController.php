<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\DispatchHelpBookEntryRequest;
use App\Models\DispatchHelpBookEntry;
use Illuminate\Http\JsonResponse;

class DispatchHelpBookController extends ApiController
{
    public function index(): JsonResponse
    {
        return $this->ok(
            'Dispatch Help Book entries fetched successfully',
            DispatchHelpBookEntry::query()->orderBy('name')->orderBy('id')->get()
        );
    }

    public function store(DispatchHelpBookEntryRequest $request): JsonResponse
    {
        return $this->ok(
            'Dispatch Help Book entry created successfully',
            DispatchHelpBookEntry::create($request->validated()),
            [],
            201
        );
    }
}
