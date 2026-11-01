<?php
require __DIR__.'/../vendor/autoload.php';
$app=require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default'=>'sqlite','database.connections.sqlite.database'=>':memory:']);
$db=Illuminate\Support\Facades\DB::connection();
$db->statement('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, phone TEXT)');
$db->statement('CREATE TABLE customers (id INTEGER PRIMARY KEY, primary_name TEXT, company_name TEXT, phone TEXT)');
$db->statement('CREATE TABLE service_requests (id INTEGER PRIMARY KEY, request_date TEXT, status TEXT, payment_status TEXT, scheduled_user_id INTEGER, customer_id INTEGER, created_by INTEGER, updated_at TEXT)');
$db->statement('CREATE TABLE service_request_items (id INTEGER PRIMARY KEY, service_request_id INTEGER, service_charges DECIMAL(14,2))');
$db->statement('CREATE TABLE service_request_charges (id INTEGER PRIMARY KEY, service_request_id INTEGER, amount DECIMAL(14,2))');
$db->statement('CREATE TABLE activity_logs (id INTEGER PRIMARY KEY, module TEXT, entity_type TEXT, entity_id INTEGER, action TEXT, description TEXT, old_values TEXT, new_values TEXT, created_by INTEGER, ip_address TEXT, created_at TEXT, updated_at TEXT)');
$migration=require __DIR__.'/../database/migrations/2026_10_04_000001_add_service_payment_submission.php';$migration->up();
$db->table('users')->insert(['id'=>1,'name'=>'Tester']);
foreach ([[1,'2026-10-01','completed','received',1],[2,'2026-10-10','completed','pending',1],[3,'2026-10-15','in_progress','received',2],[4,'2026-09-30','completed','received',1],[5,'2026-10-31','cancelled','pending',1]] as [$id,$date,$status,$payment,$user]) {
 $db->table('service_requests')->insert(['id'=>$id,'request_date'=>$date,'status'=>$status,'payment_status'=>$payment,'scheduled_user_id'=>$user]);
 $db->table('service_request_items')->insert([['service_request_id'=>$id,'service_charges'=>100],['service_request_id'=>$id,'service_charges'=>50]]);
 $db->table('service_request_charges')->insert([['service_request_id'=>$id,'amount'=>20],['service_request_id'=>$id,'amount'=>30]]);
}
function check($ok,$message) { if (!$ok) throw new RuntimeException($message); }
$service=app(App\Services\ServiceRequestService::class);
$request=Illuminate\Http\Request::create('/','GET',['month'=>'2026-10','per_page'=>1]);
$result=$service->payments($request);
check($result['revenue']===400.0,'Incorrect revenue or duplicate joined amounts');
check($result['collection']===400.0,'Incorrect collections');
check($result['entries']->total()===1,'List should require both statuses');
check($result['entries']->first()->id===1,'Wrong entry');
$actor=App\Models\User::find(1);
$request->merge(['scope'=>'mine']);$request->setUserResolver(fn()=>$actor);
check($service->payments($request)['collection']===200.0,'Mine scope incorrect');
$first=$service->submitPayment(1,$actor,null);
check($first->payment_submitted_by===1 && $first->payment_submitted_at!==null,'Submission not saved');
$service->submitPayment(1,$actor,null);
check($db->table('activity_logs')->count()===1,'Duplicate submission logged');
foreach ([2,3,5] as $invalid) {
 try { $service->submitPayment($invalid,$actor,null);throw new RuntimeException('Invalid submission accepted'); }
 catch (Illuminate\Validation\ValidationException) {}
}
$request->merge(['month'=>'2026-11']);$empty=$service->payments($request);
check($empty['revenue']===0.0 && $empty['collection']===0.0 && $empty['entries']->total()===0,'Empty month incorrect');
$all=Illuminate\Http\Request::create('/','GET',['per_page'=>1]);
$result=$service->payments($all);
check($result['entries']->total()===2,'Default must include all months');
check($result['entries']->first()->id===4,'Older unsubmitted payment must precede newer submitted payment');
check($result['revenue']===600.0 && $result['collection']===600.0,'All-time totals incorrect');
$all->merge(['submission'=>'pending']);
check($service->payments($all)['entries']->total()===1,'Pending filter includes submitted payments');
$all->merge(['month'=>'2026-10']);
check($service->payments($all)['entries']->total()===0,'Month and pending filters do not combine');
$all->merge(['month'=>'']);
check($service->payments($all)['entries']->total()===1,'Cleared month should show all months');
$service->submitPayment(4,$actor,null);
check($service->payments($all)['entries']->total()===0,'Submitted payment remains pending');
echo "PASS: all-time defaults, optional month, pending filter, unsubmitted-first pagination, totals, scope and submission.\n";
