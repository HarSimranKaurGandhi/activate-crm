<?php

namespace App\Http\Controllers\Api\Users;

use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\RoleDropdownResource;
use App\Services\RoleService;
use Illuminate\Http\JsonResponse;

class RoleController extends ApiController
{
    public function __construct(private RoleService $roles)
    {
    }

    public function index(): JsonResponse
    {
        return $this->ok(
            'Roles fetched successfully',
            RoleDropdownResource::collection($this->roles->dropdown())
        );
    }
}
