<?php
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default'=>'sqlite','database.connections.sqlite.database'=>':memory:']);
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use App\Models\{Lead, Customer, User, Role, ActivityLog};
Schema::create('leads', function(Blueprint $t) { $t->id(); foreach((new Lead)->getFillable() as $field) $t->text($field)->nullable(); $t->timestamps(); });
Schema::create('customers', function(Blueprint $t) { $t->id(); foreach((new Customer)->getFillable() as $field) $t->text($field)->nullable(); $t->timestamps(); });
Schema::create('users', function(Blueprint $t) { $t->id(); $t->string('name'); $t->string('email')->nullable(); $t->integer('role_id')->nullable(); $t->boolean('is_active')->default(true); $t->timestamps(); });
Schema::create('roles', function(Blueprint $t) { $t->id(); $t->string('name'); $t->string('code'); $t->timestamps(); });
Schema::create('activity_logs', function(Blueprint $t) { $t->id(); foreach(['module','entity_type','entity_id','action','description','old_values','new_values','user_id','created_by','ip_address'] as $f) $t->text($f)->nullable(); $t->timestamps(); });
function checkRequirement($ok, $message) { if(!$ok) throw new RuntimeException($message); }
$role=Role::create(['name'=>'Admin','code'=>'admin']);
$user=User::create(['name'=>'Admin','role_id'=>$role->id]);
$customer=Customer::create(['primary_name'=>'Test Customer','phone'=>'9876543210','email'=>'test@example.com','city'=>'Delhi','address_line_1'=>'Test Address']);
$service=app(App\Services\LeadService::class);
$data=['requirement'=>'New treadmill','assigned_to'=>$user->id];
$lead=$service->generateCustomerRequirement($customer,$data,$user);
checkRequirement($lead->status==='new' && $lead->city==='Delhi' && $lead->name==='Test Customer','Customer details not copied');
checkRequirement((int)$lead->assigned_to===$user->id && $lead->requirement==='New treadmill','Requirement or assignee missing');
$lead->update(['status'=>'closed_fail','failure_reason'=>'other','failure_reason_details'=>'Old failure']);
$reopened=$service->generateCustomerRequirement($customer,[...$data,'requirement'=>'Updated requirement'],$user);
checkRequirement($reopened->id===$lead->id && Lead::count()===1 && $reopened->status==='new' && $reopened->failure_reason===null,'Closed lead not reopened');
checkRequirement(ActivityLog::count()===2,'History not recorded');
$customer->update(['phone'=>'','email'=>'TEST@example.com']);
checkRequirement($service->generateCustomerRequirement($customer,$data,$user)->id===$lead->id,'Email match failed');
$customer->update(['phone'=>'987 654 3210','email'=>null]);
checkRequirement($service->generateCustomerRequirement($customer,$data,$user)->id===$lead->id,'Formatted phone match failed');
$other=User::create(['name'=>'Other']);
try { $service->generateCustomerRequirement($customer,$data,$other); throw new RuntimeException('Unauthorized reopen allowed'); }
catch(Symfony\Component\HttpKernel\Exception\HttpException $e) { checkRequirement($e->getStatusCode()===403,'Wrong permission response'); }
$customer->update(['phone'=>null,'email'=>null]);
try { $service->generateCustomerRequirement($customer,$data,$user); throw new RuntimeException('Empty contacts matched'); }
catch(Illuminate\Validation\ValidationException) {}
checkRequirement(Lead::count()===1,'Duplicate created');
echo "PASS: creation, copied details, reopening, audit history, phone/email matching, permissions and missing contacts.\n";
