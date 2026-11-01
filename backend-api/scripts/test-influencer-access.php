<?php
require __DIR__.'/../vendor/autoload.php';
$app=require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default'=>'sqlite','database.connections.sqlite.database'=>':memory:']);
$db=Illuminate\Support\Facades\DB::connection();
$schema=[
 'roles'=>'id INTEGER PRIMARY KEY, name TEXT, code TEXT, description TEXT, created_at TEXT, updated_at TEXT',
 'users'=>'id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE, password TEXT, phone TEXT, role_id INTEGER, is_active INTEGER, departments TEXT, created_at TEXT, updated_at TEXT',
 'influencers'=>'id INTEGER PRIMARY KEY, name TEXT, phone TEXT, assigned_to INTEGER, is_active INTEGER, created_at TEXT, updated_at TEXT',
 'user_module_permissions'=>'id INTEGER PRIMARY KEY, user_id INTEGER, module TEXT, can_view INTEGER, can_edit INTEGER',
 'personal_access_tokens'=>'id INTEGER PRIMARY KEY, tokenable_type TEXT, tokenable_id INTEGER, name TEXT, token TEXT, abilities TEXT, last_used_at TEXT, expires_at TEXT, created_at TEXT, updated_at TEXT',
 'leads'=>'id INTEGER PRIMARY KEY, influencer_id INTEGER, assigned_to INTEGER, name TEXT, status TEXT, requirement TEXT',
 'lead_favourites'=>'lead_id INTEGER, user_id INTEGER',
 'quotations'=>'id INTEGER PRIMARY KEY, lead_id INTEGER, created_by INTEGER',
];
foreach($schema as $table=>$columns)$db->statement("CREATE TABLE $table ($columns)");
$migration=require __DIR__.'/../database/migrations/2026_10_05_000001_add_influencer_login.php';$migration->up();
$influencerRole=App\Models\Role::where('code','influencer')->first();
$adminRole=App\Models\Role::create(['code'=>'admin','name'=>'Admin']);
$admin=App\Models\User::create(['name'=>'Admin','email'=>'admin@example.test','password'=>'longpassword123','role_id'=>$adminRole->id,'is_active'=>true]);
$db->table('influencers')->insert([['id'=>1,'name'=>'Influencer One','phone'=>'9876543210','assigned_to'=>$admin->id,'is_active'=>1],['id'=>2,'name'=>'Influencer Two','phone'=>'9876543211','assigned_to'=>$admin->id,'is_active'=>1]]);
function check($ok,$message){if(!$ok)throw new RuntimeException($message);}
$account=app(App\Http\Controllers\Api\Influencers\InfluencerPortalController::class);
$request=Illuminate\Http\Request::create('/','POST',['email'=>'one@example.test','password'=>'longpassword123']);$request->setUserResolver(fn()=>$admin);
$account->loginAccount($request,1);
$one=App\Models\User::where('email','one@example.test')->firstOrFail();
check($one->hasAnyRole(['influencer']),'Wrong account role');
check(Illuminate\Support\Facades\Hash::check('longpassword123',$one->password),'Password not hashed');
$auth=app(App\Services\AuthService::class);
$login=$auth->login(['email'=>'one@example.test','password'=>'longpassword123'],$request);
check(!empty($login['token']),'Influencer cannot login');
$account->loginAccount($request,1);
check($one->tokens()->count()===0,'Password reset did not revoke sessions');
$guard=new App\Http\Middleware\InfluencerAccess();
$invoke=function($method,$path,$user)use($guard){$r=Illuminate\Http\Request::create('/api/'.$path,$method);$r->setUserResolver(fn()=>$user);return $guard->handle($r,fn()=>true);};
foreach([['DELETE','leads/1'],['PUT','leads/1'],['PATCH','leads/bulk-update'],['POST','leads/bulk-upload'],['POST','quotations/1/approve'],['PATCH','quotations/1/status'],['PUT','quotations/1'],['GET','customers'],['GET','users'],['GET','reports/leaderboard'],['POST','integrations/leads/batch'],['POST','settings/lead-api-tokens']] as [$method,$path]){
 try{$invoke($method,$path,$one);throw new RuntimeException("Unauthorized $method $path accepted");}catch(Symfony\Component\HttpKernel\Exception\HttpException $e){check($e->getStatusCode()===403,'Wrong rejection code');}
}
foreach([['GET','leads'],['POST','influencer/leads'],['POST','leads/1/comments'],['POST','quotations'],['GET','quotations/1/pdf']]as[$method,$path])check($invoke($method,$path,$one)===true,'Allowed route blocked');
$db->table('leads')->insert([['id'=>1,'influencer_id'=>1,'assigned_to'=>$admin->id,'name'=>'Own','status'=>'new','requirement'=>'Test'],['id'=>2,'influencer_id'=>2,'assigned_to'=>$admin->id,'name'=>'Other','status'=>'new','requirement'=>'Test']]);
$db->table('quotations')->insert([['id'=>1,'lead_id'=>1,'created_by'=>$one->id],['id'=>2,'lead_id'=>2,'created_by'=>$one->id],['id'=>3,'lead_id'=>1,'created_by'=>$admin->id]]);
$ownRequest=Illuminate\Http\Request::create('/api/leads','GET',['assigned_to'=>[$admin->id]]);$ownRequest->setUserResolver(fn()=>$one);$app->instance('request',$ownRequest);$ownRequest->setUserResolver(fn()=>$one);
foreach([App\Services\LeadService::class,App\Services\QuotationService::class] as $class){$service=app($class);$method=new ReflectionMethod($service,'visibleQuery');$ids=$method->invoke($service,$ownRequest)->setEagerLoads([])->pluck('id')->all();check(array_map('intval',$ids)===[1],"Cross-influencer access in $class: ".json_encode($ids));}
// Verify forged ownership fields cannot change new lead attribution.
$capturingLeads=new class extends App\Services\LeadService { public array $captured=[]; public function create(array $data,?App\Models\User $actor=null,?string $ipAddress=null): Illuminate\Database\Eloquent\Model {$this->captured=$data;throw new RuntimeException('captured');}};
$leadRequest=Illuminate\Http\Request::create('/api/influencer/leads','POST',['name'=>'Test','requirement'=>'Test','influencer_id'=>2,'assigned_to'=>999,'status'=>'closed_success']);$leadRequest->setUserResolver(fn()=>$one);$leadRequest->attributes->set('influencer',App\Models\Influencer::find(1));
try{$account->createLead($leadRequest,$capturingLeads);}catch(RuntimeException $e){check($e->getMessage()==='captured','Unexpected lead error');}
check($capturingLeads->captured['influencer_id']===1 && $capturingLeads->captured['assigned_to']===$admin->id && $capturingLeads->captured['status']==='new','Forged lead attributes accepted');
// Creation checks the linked lead before the quotation service is invoked.
$quoteRequest=new class extends App\Http\Requests\Quotations\QuotationRequest { public function validated($key=null,$default=null){return ['lead_id'=>2,'status'=>'approved'];}};
$quoteRequest->setUserResolver(fn()=>$one);$quoteRequest->attributes->set('influencer',App\Models\Influencer::find(1));
try{app(App\Http\Controllers\Api\Quotations\QuotationController::class)->store($quoteRequest);throw new RuntimeException('Foreign lead quote allowed');}catch(Symfony\Component\HttpKernel\Exception\HttpException $e){check($e->getStatusCode()===403,'Wrong quote rejection');}
$deniedRequest=Illuminate\Http\Request::create('/','POST',['email'=>'other@example.test','password'=>'longpassword123']);$deniedRequest->setUserResolver(fn()=>$one);
try{$account->loginAccount($deniedRequest,2);throw new RuntimeException('Influencer created login');}catch(Symfony\Component\HttpKernel\Exception\HttpException $e){check($e->getStatusCode()===403,'Wrong account rejection');}
$db->table('influencers')->where('id',1)->update(['is_active'=>0]);
try{$invoke('GET','leads',$one);throw new RuntimeException('Inactive influencer still has access');}catch(Symfony\Component\HttpKernel\Exception\HttpException $e){check($e->getStatusCode()===403,'Wrong inactive rejection');}
try{$auth->login(['email'=>'one@example.test','password'=>'longpassword123'],$request);throw new RuntimeException('Inactive influencer logged in');}catch(Illuminate\Validation\ValidationException){}
echo "Passed login, hashed passwords, session revocation, lead/quotation isolation, blocked routes, forced lead ownership, foreign quotation denial, admin-only provisioning, and inactive account checks.\n";
