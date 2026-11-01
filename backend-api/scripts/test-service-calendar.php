<?php
require __DIR__.'/test-service-payments.php';
$db->statement('ALTER TABLE service_requests ADD COLUMN scheduled_date TEXT');
$db->table('service_requests')->where('id',1)->update(['scheduled_date'=>'2026-10-26']);
$db->table('service_requests')->where('id',2)->update(['scheduled_date'=>'2026-11-01']);
$db->table('service_requests')->where('id',3)->update(['scheduled_date'=>'2026-11-02']);
$query=Illuminate\Http\Request::create('/','GET',['date_filter'=>'range','date_from'=>'2026-10-26','date_to'=>'2026-11-01','include_closed'=>1,'per_page'=>100]);
$result=$service->paginate($query);
check($result->pluck('id')->all()===[1,2],'Calendar range must include both boundaries and omit unscheduled/outside records');
$query->merge(['include_closed'=>0]);
check($service->paginate($query)->pluck('id')->all()===[2],'Calendar closed filter incorrect');
$query->merge(['date_to'=>'2026-11-02','scope'=>'mine']);$query->setUserResolver(fn()=>$actor);
check($service->paginate($query)->pluck('id')->all()===[2],'Calendar assignment scope incorrect');
echo "PASS: calendar date boundaries, unscheduled exclusion, closed and assignment filters.\n";

$db->statement('ALTER TABLE customers ADD COLUMN city TEXT');
$db->table('customers')->insert(['id'=>1,'primary_name'=>'City Customer','city'=>'Delhi']);
$db->table('service_requests')->where('id',2)->update(['customer_id'=>1]);
$service->addComment(App\Models\ServiceRequest::find(2),'Older comment',$actor,null);
$service->addComment(App\Models\ServiceRequest::find(2),'Latest comment',$actor,null);
$listed=$service->paginate($query)->first();
$resource=(new App\Http\Resources\ServiceRequestResource($listed))->resolve($query);
check($resource['last_comment']==='Latest comment','List missing latest service comment');
check($resource['customer']['city']==='Delhi','Service resource missing city');
echo "PASS: service city and latest-comment resource.\n";
