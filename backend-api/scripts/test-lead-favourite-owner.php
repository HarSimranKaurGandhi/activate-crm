<?php
require __DIR__.'/../vendor/autoload.php';
$app=require __DIR__.'/../bootstrap/app.php';$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default'=>'sqlite','database.connections.sqlite.database'=>':memory:']);
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use App\Models\{User,Role,Lead};
Schema::create('roles',function(Blueprint $t){$t->id();$t->string('code');$t->string('name');$t->timestamps();});
Schema::create('users',function(Blueprint $t){$t->id();$t->string('name');$t->integer('role_id');$t->timestamps();});
Schema::create('leads',function(Blueprint $t){$t->id();$t->integer('assigned_to');$t->timestamps();});
Schema::create('lead_favourites',function(Blueprint $t){$t->integer('lead_id');$t->integer('user_id');$t->timestamps();$t->unique(['lead_id','user_id']);});
$adminRole=Role::create(['code'=>'admin','name'=>'Admin']);$salesRole=Role::create(['code'=>'sales','name'=>'Sales']);
$admin=User::create(['name'=>'Admin','role_id'=>$adminRole->id]);$sales=User::create(['name'=>'Sales','role_id'=>$salesRole->id]);
$lead=Lead::create(['assigned_to'=>$sales->id]);
$service=new class extends App\Services\LeadService {public function find(int|string $id): Illuminate\Database\Eloquent\Model {return Lead::findOrFail($id);}};
$controller=new App\Http\Controllers\Api\Leads\LeadController($service);
$change=function($actor,$target,$value)use($controller,$lead){$r=Illuminate\Http\Request::create('/','PATCH',['favourite'=>$value,'favourite_user_id'=>$target->id]);$r->setUserResolver(fn()=>$actor);return $controller->favourite($r,$lead->id);};
function favouriteCheck($ok,$message){if(!$ok)throw new RuntimeException($message);}
$change($admin,$sales,true);
favouriteCheck($lead->favouritedBy()->pluck('users.id')->all()===[$sales->id],'Admin star went to wrong owner');
$read=Illuminate\Http\Request::create('/','GET',['favourite_user_id'=>$sales->id]);$read->setUserResolver(fn()=>$admin);
$query=(new ReflectionMethod(App\Services\LeadService::class,'visibleQuery'))->invoke($service,$read);
favouriteCheck((bool)$query->setEagerLoads([])->first()->is_favourite,'Selected user star state missing');
$change($admin,$admin,true);$change($admin,$sales,false);
favouriteCheck($lead->favouritedBy()->pluck('users.id')->all()===[$admin->id],'Unstar changed another owner');
try{$change($sales,$admin,false);throw new RuntimeException('Non-admin changed another owner');}catch(Symfony\Component\HttpKernel\Exception\HttpException $e){favouriteCheck($e->getStatusCode()===403,'Wrong authorization response');}
$change($sales,$sales,true);
echo "PASS: admin target-user starring, selected-user star display, independent unstar, own favourites and permission enforcement.\n";
