<?php

namespace App\Http\Controllers\Api\Settings;

use App\Http\Controllers\Api\ApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadApiTokenController extends ApiController
{
    public function index(Request $request): JsonResponse { return $this->ok('Lead API tokens fetched',$request->user()->tokens()->whereJsonContains('abilities','leads:write')->latest()->get()->map(fn($token)=>['id'=>$token->id,'name'=>$token->name,'last_used_at'=>$token->last_used_at,'created_at'=>$token->created_at])); }
    public function store(Request $request): JsonResponse
    {
        $data=$request->validate(['name'=>['required','string','max:100']]);$token=$request->user()->createToken($data['name'],['leads:write']);
        return $this->ok('Lead API token generated',['id'=>$token->accessToken->id,'name'=>$data['name'],'token'=>$token->plainTextToken,'created_at'=>$token->accessToken->created_at],[],201);
    }
    public function destroy(Request $request,int|string $id): JsonResponse { $request->user()->tokens()->whereKey($id)->whereJsonContains('abilities','leads:write')->firstOrFail()->delete();return $this->ok('Lead API token revoked'); }
}
