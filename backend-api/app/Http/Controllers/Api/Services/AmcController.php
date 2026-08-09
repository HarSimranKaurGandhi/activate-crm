<?php

namespace App\Http\Controllers\Api\Services;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Services\AmcRequest;
use App\Http\Resources\AmcResource;
use App\Http\Resources\AmcVisitResource;
use App\Services\AmcService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AmcController extends ApiController
{
    public function __construct(private AmcService $amcs){}
    public function index(Request $request): JsonResponse
    {
        $data=$request->validate(['view'=>['required',Rule::in(['this_month_visits','active','prospect_expired'])],'per_page'=>['nullable','integer','min:1','max:100'],'include_completed'=>['sometimes','boolean']]);
        $resource=$data['view']==='this_month_visits'?AmcVisitResource::class:AmcResource::class;
        return $this->paginated('AMCs fetched successfully',$this->amcs->list($data['view'],min(100,max(1,(int)($data['per_page']??50))),(bool)($data['include_completed']??false)),$resource);
    }
    public function store(AmcRequest $request): JsonResponse
    {
        return $this->ok('AMC scheduled successfully',new AmcResource($this->amcs->create($request->validated(),$request->user())),[],201);
    }
    public function show(int|string $id): JsonResponse
    {
        return $this->ok('AMC fetched successfully',new AmcResource($this->amcs->find($id)));
    }
    public function update(AmcRequest $request,int|string $id): JsonResponse
    {
        return $this->ok('AMC updated successfully',new AmcResource($this->amcs->update($this->amcs->find($id),$request->validated(),$request->user(),$request->ip())));
    }
    public function completeVisit(int|string $id): JsonResponse
    {
        return $this->ok('AMC visit marked as done',new AmcResource($this->amcs->completeNextVisit($this->amcs->find($id),request()->user(),request()->ip())));
    }
    public function activity(int|string $id): JsonResponse { return $this->ok('AMC timeline fetched successfully',$this->amcs->activity($this->amcs->find($id))); }
    public function comment(Request $request,int|string $id): JsonResponse { $data=$request->validate(['comment'=>['required','string','max:5000']]);return $this->ok('AMC comment added successfully',$this->amcs->addComment($this->amcs->find($id),$data['comment'],$request->user(),$request->ip()),[],201); }
}
