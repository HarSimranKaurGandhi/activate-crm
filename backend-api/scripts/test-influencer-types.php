<?php
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default'=>'sqlite','database.connections.sqlite.database'=>':memory:']);
$db = Illuminate\Support\Facades\DB::connection();
$db->statement('CREATE TABLE influencers (id INTEGER PRIMARY KEY, influencer_type TEXT)');
$db->table('influencers')->insert([['id'=>1,'influencer_type'=>'architect'],['id'=>2,'influencer_type'=>'custom_legacy']]);
$migration=require __DIR__.'/../database/migrations/2026_10_22_000002_create_influencer_types.php';
$migration->up();
function typeCheck(bool $ok,string $message):void { if(!$ok) throw new RuntimeException($message); }
$controller=app(App\Http\Controllers\Api\Masters\InfluencerTypeController::class);
$add=fn($name)=>$controller->store(Illuminate\Http\Request::create('/','POST',['name'=>$name]))->getData(true)['data'];
$valid=function(string $code, ?int $id=null):bool {
    $request=new App\Http\Requests\Influencers\InfluencerRequest();
    if($id) {
        $route=new Illuminate\Routing\Route('PUT','influencers/{id}',fn()=>null);
        $route->bind(Illuminate\Http\Request::create('/influencers/'.$id,'PUT'));
        $request->setRouteResolver(fn()=>$route);
    }
    return !Illuminate\Support\Facades\Validator::make(['influencer_type'=>$code],['influencer_type'=>$request->rules()['influencer_type']])->fails();
};
typeCheck(App\Models\InfluencerType::count()===7,'Existing types not seeded/backfilled');
$type=$add('  Consultant  ');
typeCheck($type['name']==='Consultant' && $valid($type['code']),'Custom type not accepted');
foreach (['Consultant','   ',str_repeat('x',101)] as $name) {
    try { $add($name); throw new RuntimeException('Invalid name accepted'); }
    catch(Illuminate\Validation\ValidationException) {}
}
$architect=App\Models\InfluencerType::where('code','architect')->firstOrFail();
$controller->destroy($architect->id);
typeCheck(!$valid('architect'),'Removed type accepted on new influencer');
typeCheck($valid('architect',1),'Existing influencer cannot keep removed type');
typeCheck(!$valid('architect',2),'Another influencer can select removed type');
typeCheck(App\Models\Influencer::find(1)->typeDefinition->name==='Architect','Removal destroyed historical type');
$list=$controller->index()->getData(true)['data'];
typeCheck(!in_array('architect',array_column($list,'code')),'Removed type remains selectable');
$restored=$add('Architect');
typeCheck($restored['id']===$architect->id && $valid('architect'),'Re-adding did not restore original type');
typeCheck(!$valid('does_not_exist'),'Unknown type accepted');
$migration->down();
echo "PASS: seeded/custom influencer types, validation, removal, historical retention and restoration.\n";
