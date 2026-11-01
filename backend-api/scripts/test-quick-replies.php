<?php
require __DIR__.'/../vendor/autoload.php';
$app=require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['cache.default'=>'array', 'cache.stores.array'=>['driver'=>'array']]);
config(['database.default'=>'sqlite','database.connections.sqlite.database'=>':memory:']);
(require __DIR__.'/../database/migrations/2026_10_27_000001_create_quick_replies.php')->up();
$controller=app(App\Http\Controllers\Api\Masters\QuickReplyController::class);
function replyCheck($ok,$message) { if(!$ok) throw new RuntimeException($message); }
$list=$controller->index()->getData(true)['data'];
replyCheck(array_column($list,'name')===['Followed up on WhatsApp','Called and discussed again','Almost final'],'Default replies incorrect');
$reply=$controller->store(Illuminate\Http\Request::create('/','POST',['name'=>'  Share quotation  ']))->getData(true)['data'];
replyCheck($reply['name']==='Share quotation','Reply not trimmed');
replyCheck(count($controller->index()->getData(true)['data'])===4,'Create did not invalidate cache');
foreach(['','  ',str_repeat('x',256),'Almost final'] as $invalid) {
 try { $controller->store(Illuminate\Http\Request::create('/','POST',['name'=>$invalid])); throw new RuntimeException('Invalid reply accepted'); }
 catch(Illuminate\Validation\ValidationException) {}
}
$controller->update(Illuminate\Http\Request::create('/','PUT',['name'=>'Quotation shared']),$reply['id']);
replyCheck(in_array('Quotation shared',array_column($controller->index()->getData(true)['data'],'name')),'Edit did not invalidate cache');
$controller->destroy($reply['id']);
replyCheck(App\Models\QuickReply::count()===3,'Removal failed');
replyCheck(count($controller->index()->getData(true)['data'])===3,'Delete did not invalidate cache');
Illuminate\Support\Facades\DB::enableQueryLog();
Illuminate\Support\Facades\DB::flushQueryLog();
$controller->index(); $controller->index();
replyCheck(count(Illuminate\Support\Facades\DB::getQueryLog())===0,'Cached reads still query database');
echo "PASS: caching and mutation invalidation;  default quick replies, create, edit, remove, trimming and validation.\n";
