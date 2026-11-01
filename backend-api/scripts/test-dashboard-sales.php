<?php
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default'=>'sqlite','database.connections.sqlite.database'=>':memory:']);
$db=Illuminate\Support\Facades\DB::connection();
$db->statement('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, phone TEXT, designation TEXT, departments TEXT, role_id INTEGER, is_active INTEGER)');
$db->statement('CREATE TABLE roles (id INTEGER PRIMARY KEY, name TEXT, code TEXT)');
$db->statement('CREATE TABLE tasks (id INTEGER PRIMARY KEY, name TEXT, description TEXT, status TEXT, due_date TEXT, assigned_to INTEGER)');
$db->statement('CREATE TABLE leads (id INTEGER PRIMARY KEY, name TEXT, phone TEXT, email TEXT, city TEXT, status TEXT, requirement TEXT, follow_up_date TEXT, assigned_to INTEGER, influencer_id INTEGER)');
$db->statement('CREATE TABLE influencers (id INTEGER PRIMARY KEY, name TEXT, phone TEXT)');
$db->table('influencers')->insert(['id'=>1,'name'=>'Test influencer','phone'=>'9876543210']);
$db->table('roles')->insert([['id'=>1,'name'=>'Admin','code'=>'admin'],['id'=>2,'name'=>'Sales','code'=>'sales']]);
foreach ([1=>[],2=>['sales'],3=>['service'],4=>['sales','service']] as $id=>$departments) {
 $db->table('users')->insert(['id'=>$id,'name'=>'User '.$id,'departments'=>json_encode($departments),'role_id'=>$id===1?1:2,'is_active'=>1]);
 foreach ([now()->toDateString(),now()->subDay()->toDateString()] as $date) {
  $db->table('tasks')->insert(['name'=>'Task','status'=>'new','due_date'=>$date,'assigned_to'=>$id]);
  $db->table('leads')->insert(['name'=>'Lead','status'=>'new','follow_up_date'=>$date,'assigned_to'=>$id,'influencer_id'=>1]);
 }
}
function check($condition,$message) { if (!$condition) throw new RuntimeException($message); }
foreach ([[1,['scope'=>'all'],[2,4]],[1,['scope'=>'all','user_id'=>2],[2]],[2,['scope'=>'all','user_id'=>4],[2]],[3,[],[]]] as [$actor,$params,$expected]) {
 $request=Illuminate\Http\Request::create('/','GET',$params);
 $request->setUserResolver(fn()=>App\Models\User::find($actor));
 $result=app(App\Services\DashboardService::class)->summary($request);
 foreach (['tasks_due_today','overdue_tasks','follow_ups_due_today','overdue_follow_ups'] as $key) {
  $ids=array_column($result[$key],'assigned_to');sort($ids);
  if (in_array($key, ['follow_ups_due_today', 'overdue_follow_ups'])) {
   foreach ($result[$key] as $lead) check($lead['influencer'] === ['name'=>'Test influencer','phone'=>'9876543210'], 'Missing influencer contact');
  }
  check($ids===$expected,"Wrong scope for $actor / $key");
  check($result[$key.'_count']===count($expected),'Wrong count');
 }
}
foreach ([[1,2,true],[1,3,false],[2,4,false],[1,999,false],[1,4,true]] as [$actor,$target,$expected]) {
 $request=App\Http\Requests\Dashboard\DashboardSummaryRequest::create('/','GET',['scope'=>'all','user_id'=>$target]);
 $request->setUserResolver(fn()=>App\Models\User::find($actor));
 $validator=Illuminate\Support\Facades\Validator::make($request->all(),$request->rules());
 check($validator->passes()===$expected,'Invalid user selection validation');
}
foreach (['today','week','month'] as $period) {
 $rows=app(App\Services\LeaderboardService::class)->current($period,true)['rows'];
 $ids=array_column($rows,'user_id');sort($ids);check($ids===[2,4],'Leaderboard includes non-Sales users');
}
echo "Passed dashboard scope, counts, Sales membership, admin authorization, and all leaderboard periods.\n";
