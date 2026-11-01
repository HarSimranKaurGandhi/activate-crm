<?php
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default'=>'sqlite','database.connections.sqlite.database'=>':memory:']);
$db=Illuminate\Support\Facades\DB::connection();
$db->statement('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)');
$db->statement('CREATE TABLE activity_logs (id INTEGER PRIMARY KEY, module TEXT, entity_type TEXT, entity_id INTEGER, action TEXT, description TEXT, old_values TEXT, new_values TEXT, user_id INTEGER, created_by INTEGER, ip_address TEXT, created_at TEXT, updated_at TEXT)');
$db->statement('CREATE TABLE customers (id INTEGER PRIMARY KEY, primary_name TEXT, company_name TEXT)');
$db->statement('CREATE TABLE service_requests (id INTEGER PRIMARY KEY, service_number TEXT, customer_id INTEGER, temporary_customer_name TEXT)');
$db->table('users')->insert(['id'=>1]);
$db->table('customers')->insert([['id'=>1,'primary_name'=>'Customer One','company_name'=>null],['id'=>2,'primary_name'=>'Customer Two','company_name'=>null]]);
$db->table('service_requests')->insert([['id'=>1,'service_number'=>'SR-1','customer_id'=>1,'temporary_customer_name'=>null],['id'=>2,'service_number'=>'SR-2','customer_id'=>null,'temporary_customer_name'=>'Temporary Customer']]);
$migration=require __DIR__.'/../database/migrations/2026_10_10_000001_create_spare_part_requests.php';
$migration->up();
$oemMigration=require __DIR__.'/../database/migrations/2026_10_15_000001_create_oems.php';
$oemMigration->up();
$claimMigration=require __DIR__.'/../database/migrations/2026_10_16_000001_add_oem_request_category_and_claim_amount.php';
$claimMigration->up();
$statusMigration=require __DIR__.'/../database/migrations/2026_10_17_000001_add_status_to_spare_part_requests.php';
$statusMigration->up();
$mediaMigration=require __DIR__.'/../database/migrations/2026_10_29_000001_add_oem_request_images.php';$mediaMigration->up();
$db->statement('CREATE TABLE products (id INTEGER PRIMARY KEY, product_name TEXT)');
$db->statement('CREATE TABLE customer_owned_products (id INTEGER PRIMARY KEY, customer_id INTEGER, product_id INTEGER, product_description TEXT)');
$machineMigration=require __DIR__.'/../database/migrations/2026_10_30_000001_add_oem_machine_purchase.php';$machineMigration->up();
$controller=app(App\Http\Controllers\Api\Services\SparePartRequestController::class);
$user=App\Models\User::findOrFail(1);
$base=['spare_part_name'=>'Drive belt','machine_name'=>'Treadmill','quantity'=>2,'reason'=>'Worn belt','request_type'=>'in_warranty'];
$create=function(array $extra=[]) use($controller,$user,$base) {
    $request=Illuminate\Http\Request::create('/api/spare-part-requests','POST',array_merge($base,$extra));
    $request->setUserResolver(fn()=>$user);
    return $controller->store($request)->getData(true)['data'];
};
function check($condition,$message) { if(!$condition) throw new RuntimeException($message); }
$row=$create();
check(($row['service_request_id'] ?? null) === null,'Standalone service link should be empty');
check($row['customer_name']===null,'Standalone customer should be empty');
$row=$create(['customer_id'=>2,'request_type'=>'chargeable']);
check($row['customer_name']==='Customer Two','Standalone customer missing');
$row=$create(['service_request_id'=>1,'customer_id'=>2]);
check($row['customer_id']===1 && $row['customer_name']==='Customer One','Linked customer must come from service');
$row=$create(['service_request_id'=>2,'customer_id'=>2]);
check($row['customer_id']===null && $row['customer_name']==='Temporary Customer','Temporary service customer lost');
foreach ([['quantity'=>0],['quantity'=>1.5],['request_type'=>'invalid'],['spare_part_name'=>''],['service_request_id'=>999]] as $invalid) {
    try { $create($invalid); throw new RuntimeException('Invalid request accepted'); }
    catch(Illuminate\Validation\ValidationException $expected) {}
}
$request=Illuminate\Http\Request::create('/api/spare-part-requests','GET',['service_request_id'=>1]);
$data=$controller->index($request)->getData(true);
check(count($data['data'])===1 && $data['data'][0]['service_request']['service_number']==='SR-1','Linked list incorrect');
check($db->table('spare_part_requests')->count()===4,'Unexpected requests created');
$oemController=app(App\Http\Controllers\Api\Settings\OemController::class);
$oem=$oemController->store(Illuminate\Http\Request::create('/','POST',['name'=>'Test OEM','email'=>'parts@example.com']))->getData(true)['data'];
try { $oemController->store(Illuminate\Http\Request::create('/','POST',['name'=>'Test','email'=>'bad'])); throw new RuntimeException('Invalid email accepted'); }
catch(Illuminate\Validation\ValidationException $expected) {}
$assigned=$create(['oem_id'=>$oem['id']]);
check($assigned['oem']['email']==='parts@example.com','Creation assignment missing');
$assign=function($id,$oemId) use($controller) {
    return $controller->assign(Illuminate\Http\Request::create('/','PATCH',['oem_id'=>$oemId]),$id)->getData(true)['data'];
};
check($assign($row['id'],$oem['id'])['oem']['name']==='Test OEM','Existing assignment failed');
check($assign($row['id'],null)['oem']===null,'Unassignment failed');
try { $assign($row['id'],99999); throw new RuntimeException('Invalid OEM accepted'); }
catch(Illuminate\Validation\ValidationException $expected) {}
try { $create(['oem_id'=>99999]); throw new RuntimeException('Invalid OEM accepted on creation'); }
catch(Illuminate\Validation\ValidationException $expected) {}
$oemController->update(Illuminate\Http\Request::create('/','PUT',['name'=>'Updated OEM','email'=>'updated@example.com']),$oem['id']);
$list=$controller->index(Illuminate\Http\Request::create('/','GET'))->getData(true)['data'];
check($list[0]['oem']['email']==='updated@example.com','Assigned OEM details not refreshed');
$claim=$create(['request_category'=>'claim','claim_amount'=>'1234.50']);
check($claim['claim_amount']==='1234.50' && $claim['request_category']==='claim','Claim amount not saved');
$part=$create(['request_category'=>'spare_part','claim_amount'=>'500']);
check($part['claim_amount']===null,'Spare part retained claim amount');
foreach ([null, '', '0', '-1', '1.234', 'invalid', '10000000000'] as $amount) {
    try { $create(['request_category'=>'claim','claim_amount'=>$amount]); throw new RuntimeException('Invalid claim amount accepted'); }
    catch(Illuminate\Validation\ValidationException $expected) {}
}
try { $create(['request_category'=>'invalid']); throw new RuntimeException('Invalid category accepted'); }
catch(Illuminate\Validation\ValidationException $expected) {}
check($create()['request_category']==='spare_part','Legacy request default changed');
$updateStatus=function($id, $status) use($controller,$base) {
    return $controller->update(Illuminate\Http\Request::create('/','PUT',array_merge($base,['status'=>$status])),$id)->getData(true)['data'];
};
check($create()['status']==='pending','Default status must be pending');
check($create(['status'=>'closed'])['status']==='closed','Cannot create closed request');
try { $create(['status'=>'invalid']); throw new RuntimeException('Invalid creation status accepted'); }
catch(Illuminate\Validation\ValidationException $expected) {}
$closed=$updateStatus($claim['id'],'closed');
check($closed['status']==='closed','Closing through edit failed');
$visible=$controller->index(Illuminate\Http\Request::create('/','GET'))->getData(true)['data'];
check(!in_array($claim['id'],array_column($visible,'id')),'Closed request visible by default');
$all=$controller->index(Illuminate\Http\Request::create('/','GET',['include_closed'=>1]))->getData(true)['data'];
check(in_array($claim['id'],array_column($all,'id')),'Show closed omitted request');
$reopened=$updateStatus($claim['id'],'pending');
check($reopened['status']==='pending','Reopening through edit failed');
try { $updateStatus($claim['id'],'invalid'); throw new RuntimeException('Invalid edit status accepted'); }
catch(Illuminate\Validation\ValidationException $expected) {}
check(!method_exists($controller,'status'),'Standalone status endpoint must be removed');
$filtered=$controller->index(Illuminate\Http\Request::create('/','GET',['oem_id'=>$oem['id']]))->getData(true)['data'];
check(count($filtered)>0 && collect($filtered)->every(fn($r)=>(int)$r['oem_id']===(int)$oem['id']), 'OEM filter returned unrelated requests');
$unassigned=$controller->index(Illuminate\Http\Request::create('/','GET',['unassigned'=>1]))->getData(true)['data'];
check(count($unassigned)>0 && collect($unassigned)->every(fn($r)=>$r['oem_id']===null), 'Unassigned filter failed');
$detail=$controller->show($assigned['id'])->getData(true)['data'];
check($detail['oem']['name']==='Updated OEM', 'View endpoint did not load OEM');
$edit=function(array $extra=[]) use($controller,$user,$base,$assigned) {
    $request=Illuminate\Http\Request::create('/','PUT',array_merge($base,$extra));
    $request->setUserResolver(fn()=>$user);
    return $controller->update($request,$assigned['id'])->getData(true)['data'];
};
App\Models\SparePartRequest::findOrFail($assigned['id'])->update(['status'=>'closed','image_path'=>'uploads/retained-test.png','image_paths'=>null]);
$updated=$edit(['spare_part_name'=>'Updated belt','service_request_id'=>1,'customer_id'=>2,'request_category'=>'claim','claim_amount'=>'125.50']);
check($updated['spare_part_name']==='Updated belt' && $updated['claim_amount']==='125.50', 'Edit details not persisted');
check($updated['status']==='closed' && $updated['created_by']===$assigned['created_by'] && $updated['request_number']===$assigned['request_number'], 'Editing changed request identity/status');
check($updated['image_path']==='uploads/retained-test.png', 'Edit without image cleared existing image');
check($updated['customer_id']===1 && $updated['service_request']['customer']['id']===1, 'Edit linked customer enforcement failed');
$combined=$controller->index(Illuminate\Http\Request::create('/','GET',['oem_id'=>$oem['id'],'include_closed'=>1,'search'=>'Updated belt','service_request_id'=>1]))->getData(true)['data'];
check(count($combined)===1 && $combined[0]['id']===$assigned['id'], 'Combined filters failed');
$updated=$edit(['service_request_id'=>null,'customer_id'=>2,'oem_id'=>null,'request_category'=>'spare_part']);
check($updated['service_request_id']===null && $updated['customer_id']===2 && $updated['oem_id']===null && $updated['claim_amount']===null, 'Clearing links/category failed');
foreach ([['quantity'=>0],['oem_id'=>99999],['request_category'=>'claim','claim_amount'=>'-1']] as $invalid) {
    try { $edit($invalid); throw new RuntimeException('Invalid edit accepted'); }
    catch(Illuminate\Validation\ValidationException $expected) {}
}
check($controller->show($assigned['id'])->getData(true)['data']['quantity']===2, 'Invalid edit changed record');
// Dates use calendar days in the application timezone, not elapsed 24-hour periods.
Illuminate\Support\Carbon::setTestNow(Illuminate\Support\Carbon::parse('2026-10-22 00:05:00', config('app.timezone')));
try {
    $dated=$edit(['request_date'=>'2026-10-20']);
    check($dated['request_date']==='2026-10-20' && $dated['days_overdue']===2, 'Backdated request age incorrect');
    check($controller->show($assigned['id'])->getData(true)['data']['request_date']==='2026-10-20', 'Edited date not persisted');
    $sameDay=$edit(['request_date'=>'2026-10-22']);
    check($sameDay['days_overdue']===0, 'Same-day request should be zero days old');
    $yesterday=$edit(['request_date'=>'2026-10-21']);
    check($yesterday['days_overdue']===1, 'Midnight calendar-day boundary failed');
    check($edit()['request_date']==='2026-10-21', 'Unrelated edit changed request date');
    foreach (['2026-10-23', '2026-02-30', 'invalid', ''] as $date) {
        try { $edit(['request_date'=>$date]); throw new RuntimeException('Invalid request date accepted'); }
        catch(Illuminate\Validation\ValidationException $expected) {}
    }
} finally { Illuminate\Support\Carbon::setTestNow(); }
// Deleting requests removes their image, without deleting linked records.
$assetRoot=sys_get_temp_dir().'/oem-delete-'.bin2hex(random_bytes(6));
mkdir($assetRoot);
config(['filesystems.public_upload_root'=>$assetRoot]);
file_put_contents($assetRoot.'/request.png','test image');
$deletable=$create(['service_request_id'=>1,'oem_id'=>$oem['id']]);
App\Models\SparePartRequest::findOrFail($deletable['id'])->update(['image_path'=>'request.png','image_paths'=>null]);
try {
    check($controller->destroy($deletable['id'])->getStatusCode()===200,'Delete failed');
    check(!App\Models\SparePartRequest::find($deletable['id']),'Deleted request remains');
    check(!file_exists($assetRoot.'/request.png'),'Deleted request image remains');
    check(App\Models\ServiceRequest::find(1)!==null && App\Models\Customer::find(1)!==null && App\Models\Oem::find($oem['id'])!==null,'Deletion removed linked data');
    try { $controller->show($deletable['id']); throw new RuntimeException('Deleted request still viewable'); }
    catch(Illuminate\Database\Eloquent\ModelNotFoundException $expected) {}
    $closedDelete=$create(['status'=>'closed']);
    $controller->destroy($closedDelete['id']);
    check(!App\Models\SparePartRequest::find($closedDelete['id']),'Closed request not deleted');
} finally {
    if(file_exists($assetRoot.'/request.png')) unlink($assetRoot.'/request.png');
    rmdir($assetRoot);
}
$timelineRow=$create();
$timelineId=$timelineRow['id'];
$entries=$controller->activity($timelineId)->getData(true)['data'];
check(count($entries)===1 && $entries[0]['action']==='created','Creation timeline missing');
$commentRequest=Illuminate\Http\Request::create('/','POST',['comment'=>'  Followed up with OEM  ']);
$commentRequest->setUserResolver(fn()=>$user);
$controller->comment($commentRequest,$timelineId);
$entries=$controller->activity($timelineId)->getData(true)['data'];
check($entries[0]['description']==='Followed up with OEM' && $entries[0]['actor']['id']===$user->id,'Comment or author missing');
$editRequest=Illuminate\Http\Request::create('/','PUT',[...$base,'status'=>'closed']);
$editRequest->setUserResolver(fn()=>$user);
$controller->update($editRequest,$timelineId);
$entries=$controller->activity($timelineId)->getData(true)['data'];
check($entries[0]['new_values']['status']==='closed' && $entries[0]['old_values']['status']==='pending','Status history missing');
$controller->update($editRequest,$timelineId);
check(count($controller->activity($timelineId)->getData(true)['data'])===3,'No-op update added history');
$otherTimeline=$create();
check(count($controller->activity($otherTimeline['id'])->getData(true)['data'])===1,'Timeline leaked another request');
foreach(['   ',str_repeat('a',5001)] as $invalidComment) {
    $bad=Illuminate\Http\Request::create('/','POST',['comment'=>$invalidComment]);$bad->setUserResolver(fn()=>$user);
    try {$controller->comment($bad,$timelineId);throw new RuntimeException('Invalid comment allowed');}
    catch(Illuminate\Validation\ValidationException) {}
}
$listComments=$controller->index(Illuminate\Http\Request::create('/','GET',['include_closed'=>1,'per_page'=>100]))->getData(true)['data'];
$listed=collect($listComments)->firstWhere('id',$timelineId);
check($listed['last_comment']==='Followed up with OEM','List missing latest comment after status edit');
check(collect($listComments)->firstWhere('id',$otherTimeline['id'])['last_comment']===null,'Comment leaked to another request');
$commentRequest->merge(['comment'=>'Latest update']);$controller->comment($commentRequest,$timelineId);
$listed=collect($controller->index(Illuminate\Http\Request::create('/','GET',['include_closed'=>1,'per_page'=>100]))->getData(true)['data'])->firstWhere('id',$timelineId);
check($listed['last_comment']==='Latest update','List not showing newest comment');
echo "PASS: OEM timeline creation, comments, authors, status changes, no-op edits, isolation and validation.\n";
$mediaRoot=sys_get_temp_dir().'/oem-media-'.bin2hex(random_bytes(6));mkdir($mediaRoot);
config(['filesystems.public_upload_root'=>$mediaRoot]);
$png=base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=');
$mediaRequest=function(array $values=[], int $count=0)use($base,$user,$png){
    $r=Illuminate\Http\Request::create('/','POST',[...$base,...$values]);$r->setUserResolver(fn()=>$user);
    if($count)$r->files->set('images',array_map(fn($i)=>Illuminate\Http\UploadedFile::fake()->createWithContent("image{$i}.png",$png),range(1,$count)));
    return $r;
};
try {
    $media=$controller->store($mediaRequest(['estimated_completion_date'=>'2026-12-15'],4))->getData(true)['data'];
    check(count($media['images'])===4 && $media['estimated_completion_date']==='2026-12-15','Images or estimated date missing');
    try{$controller->update($mediaRequest([],1),$media['id']);throw new RuntimeException('Fifth image accepted');}catch(Illuminate\Validation\ValidationException){}
    try{$controller->update($mediaRequest(['remove_images'=>['other-request.png']]),$media['id']);throw new RuntimeException('Foreign image deletion allowed');}catch(Illuminate\Validation\ValidationException){}
    $removed=$media['images'][0]['path'];
    $media=$controller->update($mediaRequest(['remove_images'=>[$removed]],1),$media['id'])->getData(true)['data'];
    check(count($media['images'])===4 && !file_exists($mediaRoot.'/'.$removed),'Image replacement/removal failed');
    $r=$mediaRequest();$r->files->set('video',Illuminate\Http\UploadedFile::fake()->create('video.mp4',5120,'video/mp4'));
    try{$controller->update($r,$media['id']);throw new RuntimeException('Oversized video accepted');}catch(Illuminate\Validation\ValidationException){}
    $r=$mediaRequest();$r->files->set('video',Illuminate\Http\UploadedFile::fake()->create('video.mp4',100,'video/mp4'));
    $media=$controller->update($r,$media['id'])->getData(true)['data'];
    check(!empty($media['video_url']),'Video missing');
    $videoPath=$media['video_path'];
    $media=$controller->update($mediaRequest(['remove_video'=>1,'remove_images'=>array_column($media['images'],'path')]),$media['id'])->getData(true)['data'];
    check(!$media['video_url'] && !$media['images'] && !$media['image_url'] && !file_exists($mediaRoot.'/'.$videoPath),'Media removal failed');
    $controller->destroy($media['id']);
} finally {
    foreach(glob($mediaRoot.'/uploads/spare-part-requests/*') ?: [] as $file)unlink($file);
    if(is_dir($mediaRoot.'/uploads/spare-part-requests'))rmdir($mediaRoot.'/uploads/spare-part-requests');
    if(is_dir($mediaRoot.'/uploads'))rmdir($mediaRoot.'/uploads');rmdir($mediaRoot);
}
echo "PASS: four-image uploads, retained image limit, scoped removal, replacement, completion date, video size and media deletion.\n";
$db->table('products')->insert(['id'=>1,'product_name'=>'Owned Treadmill']);
$db->table('customer_owned_products')->insert(['id'=>1,'customer_id'=>1,'product_id'=>1,'product_description'=>null]);
$machine=$create(['customer_id'=>1,'customer_owned_product_id'=>1,'purchase_date'=>'2025-01-15']);
check($machine['machine_name']==='Owned Treadmill' && $machine['purchase_date']==='2025-01-15','Owned machine/date not saved');
foreach ([['customer_id'=>2,'customer_owned_product_id'=>1],['customer_owned_product_id'=>1],['purchase_date'=>now()->addDay()->toDateString()]] as $invalid) {
    try{$create($invalid);throw new RuntimeException('Invalid machine/date accepted');}catch(Illuminate\Validation\ValidationException){}
}
$custom=$create(['customer_id'=>1,'machine_name'=>'Manual Machine','purchase_date'=>'2024-01-01']);
check($custom['machine_name']==='Manual Machine' && !$custom['customer_owned_product_id'],'Custom machine not saved');
echo "PASS: customer-owned machine selection, ownership enforcement, custom machines and purchase dates.\n";
$machineMigration->down();
$mediaMigration->down();
$statusMigration->down();
$claimMigration->down();
$oemMigration->down();
$migration->down();
echo "PASS: standalone requests, linked customer enforcement, temporary customers, validation, linked listing, OEM directory, assignment, unassignment claim amount validation view/edit, OEM filtering, deletion/image cleanup, editable dates, calendar-day age and migration rollback.\n";
