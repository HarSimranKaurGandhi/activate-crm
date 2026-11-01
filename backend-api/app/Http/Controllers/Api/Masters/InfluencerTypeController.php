<?php

namespace App\Http\Controllers\Api\Masters;

use App\Http\Controllers\Api\ApiController;
use App\Models\InfluencerType;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class InfluencerTypeController extends ApiController
{
    public function index()
    {
        return $this->ok('Influencer types fetched', InfluencerType::where('is_active', true)->orderBy('name')->get(['id', 'code', 'name']));
    }

    public function store(Request $request)
    {
        if (is_string($request->input('name'))) $request->merge(['name'=>trim($request->input('name'))]);
        $data = $request->validate(['name'=>['required','string','max:100']]);
        $type = InfluencerType::where('name', $data['name'])->first();
        if ($type?->is_active) throw ValidationException::withMessages(['name'=>'This influencer type already exists.']);
        if ($type) {
            $type->update(['is_active'=>true]);
        } else {
            $type = InfluencerType::create(['name'=>$data['name'], 'code'=>strtolower((string) Str::ulid()), 'is_active'=>true]);
        }
        return $this->ok('Influencer type added', $type, [], 201);
    }

    public function destroy(int $id)
    {
        InfluencerType::findOrFail($id)->update(['is_active'=>false]);
        return $this->ok('Influencer type removed');
    }
}
