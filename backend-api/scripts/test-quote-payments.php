<?php
require __DIR__.'/../vendor/autoload.php';
$app=require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default'=>'sqlite','database.connections.sqlite.database'=>':memory:']);
use Illuminate\Support\Facades\{DB,Schema,Storage};
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\{Request,UploadedFile};
Schema::create('users',function(Blueprint $t){$t->id();$t->string('name');});
Schema::create('quotations',function(Blueprint $t){$t->id();$t->string('quotation_number');$t->string('status');$t->decimal('grand_total',14,2);$t->timestamps();});
(require __DIR__.'/../database/migrations/2026_10_28_000001_create_quote_payments.php')->up();
DB::table('users')->insert(['id'=>1,'name'=>'Tester']);
foreach(['executed','draft','locked'] as $index=>$status) DB::table('quotations')->insert(['id'=>$index+1,'quotation_number'=>'Q'.($index+1),'status'=>$status,'grand_total'=>1234.50,'created_at'=>now(),'updated_at'=>now()]);
$actor=App\Models\User::find(1);
$controller=app(App\Http\Controllers\Api\QuotePaymentController::class);
function paymentCheck($ok,$message){if(!$ok)throw new RuntimeException($message);}
$request=function(array $data=[])use($actor){$r=Request::create('/','POST',$data);$r->setUserResolver(fn()=>$actor);return $r;};
$list=fn(array $params=[])=>$controller->index(Request::create('/','GET',$params))->getData(true);
$initial=$list();
paymentCheck(count($initial['data'])===1 && $initial['data'][0]['payment_status']==='pending','Executed defaults incorrect');
$controller->status($request(['payment_status'=>'received']),'quotation',1);
paymentCheck($list()['data'][0]['payment_status']==='received','Status not persisted');
$controller->status($request(['payment_status'=>'pending']),'quotation',1);
paymentCheck(App\Models\QuotePayment::count()===1,'Duplicate payment created');
try{$controller->status($request(['payment_status'=>'received']),'quotation',2);throw new RuntimeException('Draft payment accepted');}catch(Illuminate\Database\Eloquent\ModelNotFoundException){}
try{$controller->status($request(['payment_status'=>'invalid']),'quotation',1);throw new RuntimeException('Invalid status accepted');}catch(Illuminate\Validation\ValidationException){}
$root=sys_get_temp_dir().'/quote-payments-'.bin2hex(random_bytes(6));
config(['filesystems.disks.local'=>['driver'=>'local','root'=>$root,'throw'=>true]]);
try {
 $upload=$request(['quote_number'=>' CUSTOM-1 ','amount'=>'500.25','payment_status'=>'received']);
 $upload->files->set('pdf',UploadedFile::fake()->createWithContent('quote.pdf',"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF"));
 $created=$controller->store($upload)->getData(true)['data'];
 paymentCheck(!isset($created['file_path']) && $created['quote_number']==='CUSTOM-1','Upload metadata incorrect');
 paymentCheck(count($list()['data'])===2,'Custom quote missing from list');
 paymentCheck(count($list(['payment_status'=>'received'])['data'])===1,'Status filter failed');
 paymentCheck(count($list(['search'=>'CUSTOM'])['data'])===1,'Search failed');
 paymentCheck($list(['per_page'=>1])['meta']['pagination']['total']===2,'Pagination failed');
 $controller->download($created['id']);
 $controller->status($request(['payment_status'=>'pending']),'custom',$created['id']);
 paymentCheck(count($list(['payment_status'=>'received'])['data'])===0,'Custom status update failed');
 try{$controller->store($upload);throw new RuntimeException('Duplicate accepted');}catch(Illuminate\Validation\ValidationException){}
 $bad=$request(['quote_number'=>'BAD','amount'=>'10','payment_status'=>'pending']);
 $bad->files->set('pdf',UploadedFile::fake()->createWithContent('bad.txt','plain text'));
 try{$controller->store($bad);throw new RuntimeException('Non PDF accepted');}catch(Illuminate\Validation\ValidationException){}
 paymentCheck(count(Storage::disk('local')->allFiles())===1,'Failed upload left files behind');
} finally {
 Storage::disk('local')->deleteDirectory('quote-payments');
 if(is_dir($root))rmdir($root);
}
echo "PASS: executed-only listing, defaults, both status updates, custom PDF upload/download, filters, pagination and invalid inputs.\n";
