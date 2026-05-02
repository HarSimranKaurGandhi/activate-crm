<?php

namespace App\Http\Controllers\Api;

use App\Support\ApiResponse;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Routing\Controller;

abstract class ApiController extends Controller
{
    protected function ok(string $message, mixed $data = null, array $meta = [], int $status = 200): JsonResponse
    {
        return ApiResponse::success($message, $data, $meta, $status);
    }

    protected function paginated(string $message, LengthAwarePaginator $paginator, string $resourceClass = JsonResource::class): JsonResponse
    {
        return $this->ok($message, $resourceClass::collection($paginator->getCollection()), [
            'pagination' => ApiResponse::paginationMeta($paginator),
        ]);
    }
}
