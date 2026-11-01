<?php
require __DIR__.'/../vendor/autoload.php';
$app=require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default'=>'sqlite','database.connections.sqlite.database'=>':memory:']);
$db=Illuminate\Support\Facades\DB::connection();
$db->statement('CREATE TABLE customers (id INTEGER PRIMARY KEY, primary_name TEXT, company_name TEXT, phone TEXT)');
$db->statement('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)');
$db->statement('CREATE TABLE customer_owned_products (id INTEGER PRIMARY KEY)');
$db->statement('CREATE TABLE company_settings (id INTEGER PRIMARY KEY)');
$m=require __DIR__.'/../database/migrations/2026_08_04_000001_create_amcs_tables.php';$m->up();
$db->statement('ALTER TABLE amcs ADD visits_done INTEGER DEFAULT 0');
$db->statement('ALTER TABLE amcs ADD additional_charges DECIMAL(14,2) DEFAULT 0');
$db->table('customers')->insert(['id'=>1,'primary_name'=>'Proposal Test']);
$amc=App\Models\Amc::create(['amc_number'=>'AMC-PROPOSAL-TEST','customer_id'=>1,'amc_type'=>'amc','status'=>'proposal','yearly_visits'=>2,'visits_done'=>0,'start_date'=>today(),'end_date'=>today()->addYear()]);
$amc->items()->create(['machine_name'=>'Test Machine','amc_charges'=>100]);
$amc->visits()->create(['visit_number'=>1,'scheduled_date'=>today(),'status'=>'pending']);
function check($ok,$message){if(!$ok)throw new RuntimeException($message);}
$service=app(App\Services\AmcService::class);
check($service->list('prospect_expired',10)->total()===1,'Proposal missing from prospects');
check($service->list('active',10)->total()===0,'Proposal counted as active');
check($service->list('this_month_visits',10)->total()===0,'Proposal visits shown as active');
foreach (['complete','update'] as $action) {
 try { if($action==='complete')$service->completeNextVisit($amc);else $service->updateVisitStatus($amc,['status'=>'completed']);throw new RuntimeException('Proposal visit updated'); }
 catch(Illuminate\Validation\ValidationException){}
}
$rules=(new App\Http\Requests\Services\AmcRequest())->rules();
check(Illuminate\Support\Facades\Validator::make(['status'=>'proposal'],['status'=>$rules['status']])->passes(),'Proposal rejected by validation');
$resource=(new App\Http\Resources\AmcResource($amc->load(['customer','items','visits'])))->toArray(Illuminate\Http\Request::create('/'));
check($resource['can_complete_visit']===false,'Proposal exposes visit action');
$pdf=app(App\Services\AmcPdfService::class)->renderProposal($amc);
check(str_starts_with(file_get_contents($pdf['path']),'%PDF-'),'Invalid proposal PDF');
unlink($pdf['path']);
echo "Passed proposal validation, inactive behavior, visit guards, and actual proposal PDF generation.\n";
