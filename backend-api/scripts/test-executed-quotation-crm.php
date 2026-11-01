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

use App\Models\{Quotation, QuotationItem, CustomerOwnedProduct};
Schema::create('quotations', function(Blueprint $t) { $t->id(); foreach((new Quotation)->getFillable() as $f) $t->text($f)->nullable(); $t->timestamps(); });
(require __DIR__.'/../database/migrations/2026_10_26_000001_add_crm_purchase_date_to_quotations.php')->up();
Schema::create('quotation_items', function(Blueprint $t) { $t->id(); foreach((new QuotationItem)->getFillable() as $f) $t->text($f)->nullable(); $t->timestamps(); });
Schema::create('customer_owned_products', function(Blueprint $t) { $t->id(); foreach((new CustomerOwnedProduct)->getFillable() as $f) $t->text($f)->nullable(); $t->timestamps(); });
foreach(['quotation_adjustments','quotation_terms'] as $table) Schema::create($table, function(Blueprint $t) { $t->id(); $t->integer('quotation_id'); });
function verifyCrm($ok, $message) { if(!$ok) throw new RuntimeException($message); }
$role=Role::create(['name'=>'Admin','code'=>'admin']);
$user=User::create(['name'=>'Admin','role_id'=>$role->id]);
$lead=Lead::create(['name'=>'Buyer','phone'=>'9876543210','status'=>'new','requirement'=>'Equipment']);
$quote=Quotation::create(['status'=>'executed','lead_id'=>$lead->id]);
QuotationItem::create(['quotation_id'=>$quote->id,'product_id'=>1,'product_name'=>'Treadmill','quantity'=>2]);
QuotationItem::create(['quotation_id'=>$quote->id,'product_id'=>null,'product_name'=>'Custom machine','quantity'=>1]);
$service=app(App\Services\ExecutedQuotationService::class);
$date=now()->subDay()->toDateString();
$service->complete($quote->id,['add_products'=>true,'purchase_date'=>$date],$user,null);
verifyCrm($lead->fresh()->status==='new','Adding products closed lead without consent');
verifyCrm(Customer::count()===1 && CustomerOwnedProduct::count()===2,'Customer/products not created');
verifyCrm((float)CustomerOwnedProduct::where('product_id',1)->first()->quantity===2.0,'Quantity incorrect');
verifyCrm(CustomerOwnedProduct::first()->first_purchased_at->toDateString()===$date,'Purchase date incorrect');
$service->complete($quote->id,['close_lead'=>true,'add_products'=>true,'purchase_date'=>$date],$user,null);
verifyCrm($lead->fresh()->status==='closed_success','Lead not closed');
verifyCrm(CustomerOwnedProduct::count()===2 && (float)CustomerOwnedProduct::where('product_id',1)->first()->quantity===2.0,'Retry duplicated products');
verifyCrm(ActivityLog::count()===1,'Lead closure audit missing');
$service->complete($quote->id,['close_lead'=>true],$user,null);
verifyCrm(ActivityLog::count()===1,'Repeated closure added duplicate audit');
$quote->update(['status'=>'locked']);
try { $service->complete($quote->id,['close_lead'=>true],$user,null); throw new RuntimeException('Non executed quote accepted'); }
catch(Illuminate\Validation\ValidationException) {}
$empty=Quotation::create(['status'=>'executed','lead_id'=>$lead->id]);
$lead->refresh()->update(['status'=>'new']);
try { $service->complete($empty->id,['close_lead'=>true,'add_products'=>true,'purchase_date'=>$date],$user,null); throw new RuntimeException('Empty quote accepted'); }
catch(Illuminate\Validation\ValidationException) {}
verifyCrm($lead->fresh()->status==='new','Failure did not roll back closure');
$customerQuote=Quotation::create(['status'=>'executed','customer_id'=>Customer::first()->id]);
try { $service->complete($customerQuote->id,['close_lead'=>true],$user,null); throw new RuntimeException('Missing lead accepted'); }
catch(Illuminate\Validation\ValidationException) {}
echo "PASS: executed-only actions, independent closure/product registration, purchase date, custom products, audit history, retry protection and rollback.\n";
