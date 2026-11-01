<?php

namespace App\Http\Controllers\Api\Masters;

use App\Http\Controllers\Api\ApiController;
use App\Models\Tag;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TagController extends ApiController
{
    public function index(): JsonResponse
    {
        return $this->ok('Tags fetched successfully', Tag::query()->orderBy('name')->get(['id', 'name']));
    }

    public function store(Request $request): JsonResponse
    {
        return $this->ok('Tag created successfully', Tag::create($this->validated($request)), [], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $tag = Tag::findOrFail($id);
        $tag->update($this->validated($request, $id));

        return $this->ok('Tag updated successfully', $tag);
    }

    public function destroy(int $id): JsonResponse
    {
        Tag::findOrFail($id)->delete();

        return $this->ok('Tag deleted successfully');
    }

    private function validated(Request $request, ?int $id = null): array
    {
        if (is_string($request->input('name'))) {
            $request->merge(['name' => trim($request->input('name'))]);
        }

        return $request->validate(['name' => ['required', 'string', 'max:100', Rule::unique('tags', 'name')->ignore($id)]]);
    }
}
