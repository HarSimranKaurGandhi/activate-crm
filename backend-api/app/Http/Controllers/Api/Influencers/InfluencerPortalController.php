<?php
namespace App\Http\Controllers\Api\Influencers;

use App\Http\Controllers\Api\ApiController;
use App\Models\Influencer;
use App\Models\User;
use App\Models\Role;
use App\Services\LeadService;
use App\Http\Resources\LeadResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class InfluencerPortalController extends ApiController
{
    public function loginAccount(Request $request, int $id)
    {
        abort_unless($request->user()->hasAnyRole(['admin']),403);
        $data=$request->validate(['email'=>['required','email','max:255'],'password'=>['required','string','min:12','max:128']]);
        $result=DB::transaction(function () use ($id,$data) {
            $influencer=Influencer::query()->lockForUpdate()->findOrFail($id);
            validator($data,['email'=>[Rule::unique('users','email')->ignore($influencer->user_id)]])->validate();
            $role=Role::query()->where('code','influencer')->firstOrFail();
            $user=$influencer->user_id ? User::query()->findOrFail($influencer->user_id) : new User();
            abort_if($user->exists && !$user->hasAnyRole(['influencer']),422,'Linked account must be an influencer account.');
            $user->forceFill(['name'=>$influencer->name,'email'=>$data['email'],'password'=>Hash::make($data['password']),'phone'=>$influencer->phone,'role_id'=>$role->id,'is_active'=>true,'departments'=>[]])->save();
            $influencer->forceFill(['user_id'=>$user->id])->save();
            $user->tokens()->delete();
            return ['email'=>$user->email];
        });
        return $this->ok('Influencer login saved. Share these credentials with the influencer.', $result);
    }

    public function createLead(Request $request, LeadService $leads)
    {
        $influencer=$request->attributes->get('influencer');
        abort_unless($influencer,403);
        $data=$request->validate([
            'name'=>['required','string','max:255'], 'phone'=>['nullable','digits:10'],
            'email'=>['nullable','email','max:255'], 'requirement'=>['required','string','max:5000'],
            'city'=>['nullable','string','max:100'], 'address_line_1'=>['nullable','string','max:255'],
        ]);
        $data=[...$data,'influencer_id'=>$influencer->id,'assigned_to'=>$influencer->assigned_to,'created_by'=>$request->user()->id,
            'lead_source'=>'reference','status'=>'new','follow_up_date'=>today()->toDateString()];
        return $this->ok('Lead added successfully',new LeadResource($leads->create($data,$request->user(),$request->ip())),[],201);
    }
}
