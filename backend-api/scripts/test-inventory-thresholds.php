<?php
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default'=>'sqlite','database.connections.sqlite.database'=>':memory:']);
$db=Illuminate\Support\Facades\DB::connection();
$db->statement('CREATE TABLE products (id INTEGER PRIMARY KEY, product_name TEXT, model_number TEXT, unit TEXT, is_active INTEGER)');
$db->statement('CREATE TABLE inventory_stocks (id INTEGER PRIMARY KEY, product_id INTEGER, style TEXT, quantity DECIMAL(14,3), godown_id INTEGER)');
$migration=require __DIR__.'/../database/migrations/2026_09_29_000001_create_inventory_thresholds_table.php';
$migration->up();
foreach ([1,2,3] as $id) $db->table('products')->insert(['id'=>$id,'product_name'=>'Product '.$id,'unit'=>'pcs','is_active'=>1]);
$db->table('inventory_stocks')->insert([
 ['product_id'=>1,'style'=>'Red','quantity'=>2,'godown_id'=>1],
 ['product_id'=>1,'style'=>'Red','quantity'=>3,'godown_id'=>2],
 ['product_id'=>1,'style'=>'Blue','quantity'=>0,'godown_id'=>1],
 ['product_id'=>2,'style'=>'','quantity'=>7,'godown_id'=>1],
 ['product_id'=>2,'style'=>'','quantity'=>1,'godown_id'=>2],
]);
function check($ok,$message) { if (!$ok) throw new RuntimeException($message); }
$service=app(App\Services\InventoryThresholdService::class);
$list=fn()=>collect($service->listing(Illuminate\Http\Request::create('/'))->items());
$rows=$list();
check($rows->count()===4,'Wrong combination count');
check($rows->where('product_id',2)->count()===1,'Unstyled product duplicated');
check($rows->where('product_id',3)->count()===1,'Product without stock missing');
check((float)$rows->where('style','Red')->first()->stock_quantity===5.0,'Godown sum incorrect');
$service->save(1,'Red','4.125');
$service->save(1,'Blue',0);
$service->save(3,'','2');
check((float)$list()->where('style','Red')->first()->threshold_quantity===4.125,'Decimal threshold not saved');
$service->save(1,'Red','6');
check($db->table('inventory_thresholds')->count()===3,'Update created duplicate');
$service->save(1,'Red',null);
check($list()->where('style','Red')->first()->threshold_quantity===null,'Threshold not cleared');
try { $service->save(1,'Unknown',2); throw new RuntimeException('Invented style accepted'); }
catch (Illuminate\Validation\ValidationException) {}
$request=Illuminate\Http\Request::create('/','GET',['search'=>'Blue','per_page'=>1]);
check($service->listing($request)->total()===1,'Search failed');
$controller=app(App\Http\Controllers\Api\InventoryThresholdController::class);
foreach (['-1','1.1234','abc'] as $invalid) {
 try { $controller->update(Illuminate\Http\Request::create('/','PUT',['style'=>'Red','quantity'=>$invalid]),1); throw new RuntimeException('Invalid quantity accepted'); }
 catch (Illuminate\Validation\ValidationException) {}
}
echo "Passed item/style grouping, unstyled and zero-stock items, decimal/zero thresholds, updates, clearing, search, and validation.\n";
