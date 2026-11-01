<?php
require __DIR__.'/../vendor/autoload.php';
$app=require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default'=>'sqlite','database.connections.sqlite.database'=>':memory:']);
use Illuminate\Support\Facades\{Schema,DB};
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
Schema::create('customers',function(Blueprint $t){$t->id();foreach(['primary_name','company_name','email','phone','city','state','gst_number'] as $f)$t->string($f)->nullable();$t->integer('rating');$t->boolean('is_active')->default(true);});
for($i=1;$i<=155;$i++)DB::table('customers')->insert(['primary_name'=>sprintf('Customer %03d',$i),'company_name'=>$i===155?'Target Company':null,'email'=>"customer{$i}@example.com",'phone'=>sprintf('900000%04d',$i),'city'=>$i===155?'Delhi':'Mumbai','state'=>'Test','rating'=>$i===155?5:3]);
$service=new class extends App\Services\CustomerService {protected array $relations=[];};
$search=function($data)use($service){ Illuminate\Pagination\Paginator::currentPageResolver(fn()=>$data['page']??1); return $service->paginate(Request::create('/','GET',$data)); };
function customerCheck($ok,$message){if(!$ok)throw new RuntimeException($message);}
customerCheck($search(['per_page'=>10])->total()===155,'Full customer count missing');
customerCheck($search(['name'=>'Customer 001'])->first()->id===1,'Customer beyond default first 100 not found');
customerCheck($search(['name'=>'Target','email'=>'155@','phone'=>'0155','city'=>'Delhi','rating'=>5])->total()===1,'Combined filters/company match failed');
customerCheck($search(['name'=>'Target','rating'=>3])->total()===0,'Filters did not combine');
customerCheck($search(['sort_by'=>'name','sort_direction'=>'asc','page'=>11,'per_page'=>10])->first()->primary_name==='Customer 101','Global sorting/pagination failed');
customerCheck($search(['sort_by'=>'rating','sort_direction'=>'desc'])->first()->id===155,'Rating sorting failed');
customerCheck($search(['search'=>'Target'])->total()===1,'Existing general search broken');
$rules=(new App\Http\Requests\Customers\CustomerIndexRequest)->rules();
customerCheck(Illuminate\Support\Facades\Validator::make(['sort_by'=>'invalid','rating'=>9],$rules)->fails(),'Invalid filters accepted');
echo "PASS: 155-customer pagination, beyond-first-100 search, combined filters, company search, global sorting and validation.\n";
