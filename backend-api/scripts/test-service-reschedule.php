<?php
require __DIR__.'/test-service-calendar.php';
$before=$db->table('activity_logs')->count();
$updated=$service->reschedule(2,['previous_date'=>'2026-11-01','scheduled_date'=>'2026-11-05'],$actor,null);
check($updated->scheduled_date->toDateString()==='2026-11-05','New date not saved');
check($updated->status==='completed' && $updated->payment_status==='pending','Rescheduling changed status/payment');
check($db->table('service_request_items')->where('service_request_id',2)->count()===2,'Rescheduling changed machines');
check($db->table('activity_logs')->count()===$before+1,'Reschedule not audited');
$service->reschedule(2,['previous_date'=>'2026-11-05','scheduled_date'=>'2026-11-05'],$actor,null);
check($db->table('activity_logs')->count()===$before+1,'Same date created extra history');
foreach ([['previous_date'=>'2026-11-01','scheduled_date'=>'2026-11-06'],['previous_date'=>'2026-11-05','scheduled_date'=>'2026-10-09']] as $invalid) {
 try { $service->reschedule(2,$invalid,$actor,null); throw new RuntimeException('Invalid reschedule allowed'); }
 catch(Illuminate\Validation\ValidationException) {}
}
check(App\Models\ServiceRequest::find(2)->scheduled_date->toDateString()==='2026-11-05','Rejected request modified date');
echo "PASS: rescheduling, preserved service fields, history, same-date no-op, stale updates and invalid dates.\n";
