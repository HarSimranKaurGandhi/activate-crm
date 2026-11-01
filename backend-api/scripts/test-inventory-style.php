<?php
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default'=>'sqlite','database.connections.sqlite.database'=>':memory:']);
$db = Illuminate\Support\Facades\DB::connection();
$db->statement('CREATE TABLE products (id INTEGER PRIMARY KEY)');
$db->table('products')->insert([['id'=>1],['id'=>2]]);
$migration = require __DIR__.'/../database/migrations/2026_09_29_000001_create_inventory_thresholds_table.php';
$migration->up();
$db->statement('CREATE TABLE inventory_stocks (id INTEGER PRIMARY KEY, product_id INTEGER, godown_id INTEGER, style TEXT, quantity DECIMAL(14,3), updated_at TEXT, UNIQUE(product_id,godown_id,style))');
$db->table('inventory_stocks')->insert([
 ['id'=>1,'product_id'=>1,'godown_id'=>1,'style'=>'Old','quantity'=>2.125],
 ['id'=>2,'product_id'=>1,'godown_id'=>2,'style'=>'Old','quantity'=>3.5],
 ['id'=>3,'product_id'=>1,'godown_id'=>1,'style'=>'Other','quantity'=>4],
 ['id'=>4,'product_id'=>2,'godown_id'=>1,'style'=>'Old','quantity'=>9],
]);
function check($value, $message) { if (!$value) throw new RuntimeException($message); }
$service=app(App\Services\InventoryService::class);
$before=$db->table('inventory_stocks')->orderBy('id')->pluck('quantity','id')->all();
$db->table('inventory_thresholds')->insert(['product_id'=>1,'style'=>'Old','quantity'=>5]);
$service->updateStyle(1,'Old','  New  ');
check($db->table('inventory_thresholds')->value('style')==='New', 'Threshold did not follow rename');
check($db->table('inventory_stocks')->where('style','New')->count()===2,'Not all godowns renamed');
check($db->table('inventory_stocks')->where('product_id',2)->value('style')==='Old','Other product changed');
check($before===$db->table('inventory_stocks')->orderBy('id')->pluck('quantity','id')->all(),'Quantities changed');
try { $service->updateStyle(1,'New','Other'); throw new RuntimeException('Duplicate style accepted'); }
catch (Illuminate\Validation\ValidationException) {}
check($db->table('inventory_stocks')->where('style','New')->count()===2,'Conflict changed stock');
try { $service->updateStyle(1,'Missing','New'); throw new RuntimeException('Missing style accepted'); }
catch (Illuminate\Validation\ValidationException) {}
$service->updateStyle(1,'New',null);
check($db->table('inventory_stocks')->where('style','')->count()===2,'Style could not be cleared');
$service->updateStyle(1,null,'Restored');
$service->updateStyle(1,'Restored','Restored');
check($db->table('inventory_stocks')->where('style','Restored')->count()===2,'Blank or unchanged style failed');
echo "Passed multi-godown rename, quantity preservation, product isolation, conflict rejection, stale edits, and empty styles.\n";
