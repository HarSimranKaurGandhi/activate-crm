<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\AuthResource;
use App\Http\Resources\UserResource;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends ApiController
{
    public function __construct(private AuthService $auth)
    {
    }

    public function login(LoginRequest $request): JsonResponse
    {
        return $this->ok('Logged in successfully', new AuthResource($this->auth->login($request->validated(), $request)));
    }

    public function me(Request $request): JsonResponse
    {
        return $this->ok('Current user fetched successfully', new UserResource($this->auth->profile($request->user())));
    }

    public function logout(Request $request): JsonResponse
    {
        $this->auth->logout($request->user());

        return $this->ok('Logged out successfully');
    }
}
