<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class RejectLeadIntegrationToken
{
    public function handle(Request $request,Closure $next): Response
    {
        $token=$request->user()?->currentAccessToken();
        if($token instanceof PersonalAccessToken&&$token->can('leads:write')&&!$token->can('*'))abort(403,'This token can only access the lead batch API.');
        return $next($request);
    }
}
