<?php

namespace App\Http\Controllers\Api\Leads;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Leads\LeadApiBatchRequest;
use App\Services\LeadService;
use Illuminate\Http\JsonResponse;
use Laravel\Sanctum\PersonalAccessToken;

class LeadIntegrationController extends ApiController
{
    public function __construct(private LeadService $leads) {}
    public function store(LeadApiBatchRequest $request): JsonResponse
    {
        $token=$request->user()?->currentAccessToken();
        abort_unless($request->bearerToken()&&$token instanceof PersonalAccessToken&&in_array('leads:write',$token->abilities??[],true)&&!in_array('*',$token->abilities??[],true),403,'A lead API token is required.');
        return $this->ok('Lead array processed successfully',$this->leads->importApiBatch($request->validated('leads'),$request->user(),$request->ip()));
    }
}
