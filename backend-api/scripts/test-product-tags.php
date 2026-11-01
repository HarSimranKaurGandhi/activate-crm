<?php
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:']);
$db = Illuminate\Support\Facades\DB::connection();
$db->statement('PRAGMA foreign_keys = ON');
$db->statement('CREATE TABLE products (id INTEGER PRIMARY KEY AUTOINCREMENT, product_name TEXT, model_number TEXT, category_id INTEGER, brand_id INTEGER, unit TEXT, gst_percent TEXT, hsn_code TEXT, is_active INTEGER, image_path TEXT, mrp DECIMAL, usual_selling_price DECIMAL, least_selling_price DECIMAL, specifications TEXT, created_at TEXT, updated_at TEXT)');
$db->statement('CREATE TABLE categories (id INTEGER PRIMARY KEY, gst_percent TEXT, hsn_code TEXT)');
$db->statement('CREATE TABLE brands (id INTEGER PRIMARY KEY, name TEXT, is_active INTEGER)');
$db->statement('CREATE TABLE measurement_units (id INTEGER PRIMARY KEY, code TEXT, is_active INTEGER)');
$db->statement('CREATE TABLE product_images (id INTEGER PRIMARY KEY, product_id INTEGER, is_primary INTEGER, display_order INTEGER)');
$db->table('categories')->insert([['id'=>1, 'gst_percent'=>'18', 'hsn_code'=>'1234'], ['id'=>2, 'gst_percent'=>'18', 'hsn_code'=>'5678']]);
$db->table('brands')->insert([['id'=>1, 'name'=>'Brand A', 'is_active'=>1], ['id'=>2, 'name'=>'Brand B', 'is_active'=>1]]);
$db->table('measurement_units')->insert(['id'=>1, 'code'=>'NOS', 'is_active'=>1]);
$migration = require __DIR__.'/../database/migrations/2026_10_20_000001_create_product_tags.php';
$migration->up();
function checkTag(bool $ok, string $message): void { if (!$ok) throw new RuntimeException($message); }
$controller = new App\Http\Controllers\Api\Masters\TagController();
$tagA = $controller->store(Illuminate\Http\Request::create('/', 'POST', ['name'=>' Indoor ']))->getData(true)['data'];
$tagB = $controller->store(Illuminate\Http\Request::create('/', 'POST', ['name'=>'Premium']))->getData(true)['data'];
checkTag($tagA['name'] === 'Indoor', 'Tag name not trimmed');
foreach (['Indoor', '   ', str_repeat('x', 101)] as $name) {
    try { $controller->store(Illuminate\Http\Request::create('/', 'POST', ['name'=>$name])); throw new RuntimeException('Invalid/duplicate tag accepted'); }
    catch (Illuminate\Validation\ValidationException) {}
}
$request = new App\Http\Requests\Masters\ProductRequest();
$rules = array_intersect_key($request->rules(), array_flip(['tag_ids', 'tag_ids.*']));
foreach ([[], ['tag_ids'=>[]], ['tag_ids'=>[$tagA['id'], $tagB['id']]]] as $valid) {
    checkTag(!Illuminate\Support\Facades\Validator::make($valid, $rules)->fails(), 'Valid optional tags rejected');
}
foreach ([['tag_ids'=>[999]], ['tag_ids'=>[$tagA['id'], $tagA['id']]], ['tag_ids'=>'bad']] as $invalid) {
    checkTag(Illuminate\Support\Facades\Validator::make($invalid, $rules)->fails(), 'Invalid tag IDs accepted');
}
$prepare = new ReflectionMethod($request, 'prepareForValidation');
foreach (['[]', '['.$tagA['id'].']'] as $json) {
    $request->merge(['tag_ids'=>$json]); $prepare->invoke($request);
    checkTag($request->input('tag_ids') === json_decode($json, true), 'Multipart tags not decoded');
}
$service = app(App\Services\ProductService::class);
$product = $service->create(['product_name'=>'Product', 'model_number'=>'T1', 'brand_id'=>1, 'category_id'=>1, 'tag_ids'=>[$tagA['id'], $tagB['id']]]);
checkTag($product->tags->count() === 2, 'Multiple tags not persisted');
$other = $service->create(['product_name'=>'Other', 'model_number'=>'T3', 'brand_id'=>2, 'category_id'=>2, 'tag_ids'=>[$tagA['id']]]);
$filterIds = fn (array $filters) => $service->selectable(Illuminate\Http\Request::create('/', 'GET', $filters))->getCollection()->pluck('id')->all();
checkTag($filterIds(['brand_ids'=>[1], 'category_id'=>1, 'tag_id'=>$tagB['id'], 'search'=>'T1']) === [$product->id], 'Combined filters failed');
checkTag($filterIds(['tag_id'=>$tagA['id']]) === [$other->id, $product->id], 'Shared tag filter or product ordering failed');
checkTag($filterIds(['brand_ids'=>[1], 'category_id'=>2, 'tag_id'=>$tagA['id']]) === [], 'Filters must intersect');
checkTag($filterIds(['category_id'=>2]) === [$other->id], 'Category filter failed');
checkTag(count($filterIds([])) === 2, 'Clearing filters must restore all active products');
$indexRules = (new App\Http\Requests\Masters\ProductIndexRequest())->rules();
checkTag(Illuminate\Support\Facades\Validator::make(['tag_id'=>999], $indexRules)->fails(), 'Unknown tag filter accepted');
$other->delete();

$service->update($product, ['product_name'=>'Renamed']);
checkTag($service->find($product->id)->tags->count() === 2, 'Omitted tags erased associations');
$controller->update(Illuminate\Http\Request::create('/', 'PUT', ['name'=>'Outdoor']), $tagA['id']);
checkTag($service->find($product->id)->tags->contains('name', 'Outdoor'), 'Renamed tag not reflected');
$service->update($product, ['tag_ids'=>[]]);
checkTag($service->find($product->id)->tags->isEmpty(), 'Cannot clear all tags');
$service->update($product, ['tag_ids'=>[$tagB['id']]]);
$controller->destroy($tagB['id']);
checkTag($db->table('product_tag')->count() === 0, 'Tag deletion left orphan links');
$service->update($product, ['tag_ids'=>[$tagA['id']]]);
$product->delete();
checkTag($db->table('product_tag')->count() === 0, 'Product deletion left orphan links');
$untagged = $service->create(['product_name'=>'Untagged', 'model_number'=>'T2', 'category_id'=>1]);
checkTag($untagged->tags->isEmpty(), 'Tags must be optional');
$migration->down();
echo "PASS: tag master CRUD, validation, multipart arrays, multiple product tags, omission/clearing, reload, combined product filters and cascade deletion.\n";
