<?php

namespace App\Http\Controllers\Api\Users;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Common\StatusRequest;
use App\Http\Requests\Users\StoreUserRequest;
use App\Http\Requests\Users\UserIndexRequest;
use App\Http\Requests\Users\UpdateUserRequest;
use App\Http\Resources\UserDropdownResource;
use App\Http\Resources\UserResource;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends ApiController
{
    public function __construct(private UserService $users)
    {
    }

    public function index(UserIndexRequest $request): JsonResponse
    {
        return $this->paginated(
            'Users fetched successfully',
            $this->users->paginate($request),
            UserResource::class
        );
    }

    public function dropdown(Request $request): JsonResponse
    {
        return $this->ok(
            'Users dropdown fetched successfully',
            UserDropdownResource::collection($this->users->dropdown($request))
        );
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        return $this->ok(
            'User created successfully',
            new UserResource($this->users->create($request->validated())),
            [],
            201
        );
    }

    public function show(int|string $id): JsonResponse
    {
        return $this->ok(
            'User fetched successfully',
            new UserResource($this->users->find($id))
        );
    }

    public function update(UpdateUserRequest $request, int|string $id): JsonResponse
    {
        $user = $this->users->find($id);

        return $this->ok(
            'User updated successfully',
            new UserResource($this->users->update($user, $request->validated()))
        );
    }

    public function destroy(int|string $id): JsonResponse
    {
        $this->users->delete($this->users->find($id));

        return $this->ok('User deleted successfully');
    }

    public function status(StatusRequest $request, int|string $id): JsonResponse
    {
        $user = $this->users->find($id);

        return $this->ok(
            'User status updated successfully',
            new UserResource($this->users->toggleStatus($user, $request->boolean('is_active')))
        );
    }
}
