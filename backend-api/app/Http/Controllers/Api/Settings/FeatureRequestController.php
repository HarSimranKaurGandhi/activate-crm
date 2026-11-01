<?php

namespace App\Http\Controllers\Api\Settings;

use App\Http\Controllers\Api\ApiController;
use App\Models\FeatureRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FeatureRequestController extends ApiController
{
    public function index(): JsonResponse
    {
        $requests = FeatureRequest::query()
            ->with('requester:id,name,email')
            ->latest('id')
            ->get();

        return $this->ok('Feature requests fetched successfully', $requests);
    }

    public function store(Request $request): JsonResponse
    {
        $request->merge([
            'title' => trim((string) $request->input('title')),
            'description' => filled($request->input('description'))
                ? trim((string) $request->input('description'))
                : null,
        ]);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
        ]);

        $featureRequest = FeatureRequest::query()->create([
            ...$data,
            'requested_by' => $request->user()->id,
        ])->load('requester:id,name,email');

        return $this->ok('Feature request submitted successfully', $featureRequest, [], 201);
    }

    public function destroy(Request $request, int|string $id): JsonResponse
    {
        $featureRequest = FeatureRequest::query()->findOrFail($id);
        $user = $request->user();
        $user->loadMissing('role');

        abort_unless(
            (int) $featureRequest->requested_by === (int) $user->id || $user->hasAnyRole(['admin']),
            403,
            'Only the requester or an Admin can delete this feature request.'
        );

        $featureRequest->delete();

        return $this->ok('Feature request deleted successfully');
    }
}
