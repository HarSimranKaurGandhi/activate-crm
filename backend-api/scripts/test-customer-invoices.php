<?php
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default'=>'sqlite','database.connections.sqlite.database'=>':memory:']);
$db = Illuminate\Support\Facades\DB::connection();
$db->statement('PRAGMA foreign_keys = ON');
$db->statement('CREATE TABLE customers (id INTEGER PRIMARY KEY)');
$db->statement('CREATE TABLE users (id INTEGER PRIMARY KEY)');
$db->statement('CREATE TABLE products (id INTEGER PRIMARY KEY, product_name TEXT, model_number TEXT)');
$db->statement('CREATE TABLE customer_owned_products (id INTEGER PRIMARY KEY, customer_id INTEGER, product_id INTEGER, product_description TEXT, quantity DECIMAL, updated_at TEXT)');
$db->table('customers')->insert([['id'=>1],['id'=>2]]);
$db->table('users')->insert(['id'=>1]);
$db->table('products')->insert(['id'=>1,'product_name'=>'Machine','model_number'=>'M1']);
$db->table('customer_owned_products')->insert([
    ['id'=>1,'customer_id'=>1,'product_id'=>1,'product_description'=>null,'quantity'=>1],
    ['id'=>2,'customer_id'=>1,'product_id'=>null,'product_description'=>'Custom machine','quantity'=>2],
    ['id'=>3,'customer_id'=>2,'product_id'=>1,'product_description'=>null,'quantity'=>1],
    ['id'=>4,'customer_id'=>1,'product_id'=>null,'product_description'=>'Unlinked machine','quantity'=>1],
]);
$migration = require __DIR__.'/../database/migrations/2026_10_22_000001_create_customer_invoices.php';
$migration->up();
$root = sys_get_temp_dir().'/invoice-test-'.bin2hex(random_bytes(6));
config(['filesystems.disks.local.root'=>$root]);
Illuminate\Support\Facades\Storage::forgetDisk('local');
$disk = Illuminate\Support\Facades\Storage::disk('local');
$controller = app(App\Http\Controllers\Api\Customers\CustomerInvoiceController::class);
$actor = App\Models\User::findOrFail(1);
function ensureInvoice(bool $pass, string $message): void { if (!$pass) throw new RuntimeException($message); }
$upload = function (int $customerId, array $ids, ?Illuminate\Http\UploadedFile $file = null) use ($controller, $actor) {
    $request = Illuminate\Http\Request::create('/', 'POST', ['product_ids'=>$ids,'invoice_number'=>'INV-TEST','invoice_date'=>'2026-10-22'], [], ['invoice'=>$file ?? Illuminate\Http\UploadedFile::fake()->createWithContent('invoice.pdf', "%PDF-1.4\nTest invoice\n%%EOF")]);
    $request->setUserResolver(fn()=>$actor);
    return $controller->store($request, $customerId)->getData(true)['data'];
};
try {
    $invoice = $upload(1, [1,2]);
    ensureInvoice(count($invoice['products']) === 2, 'Multiple products not linked');
    ensureInvoice(!isset($invoice['file_path']), 'Private storage path leaked');
    $record = App\Models\CustomerInvoice::findOrFail($invoice['id']);
    ensureInvoice($disk->exists($record->file_path), 'File missing');
    ensureInvoice($controller->download(1, $invoice['id'])->getStatusCode()===200, 'Download failed');
    try { $controller->download(2, $invoice['id']); throw new RuntimeException('Cross-customer download allowed'); }
    catch (Illuminate\Database\Eloquent\ModelNotFoundException) {}
    foreach ([[1],[1,4],[3],[999],[4,4]] as $ids) {
        try { $upload(1, $ids); throw new RuntimeException('Invalid or already invoiced product allowed'); }
        catch (Illuminate\Validation\ValidationException) {}
    }
    ensureInvoice(App\Models\CustomerInvoice::count()===1 && count($disk->allFiles())===1, 'Failed upload left records/files');
    ensureInvoice($db->table('customer_owned_products')->where('id',4)->value('customer_invoice_id')===null, 'Partial link committed');
    $upload(2,[3]); // The same catalog product owned by another customer remains available.
    $upload(1,[]);
    $list=$controller->index(1)->getData(true)['data'];
    ensureInvoice(count($list['invoices'])===2 && count($list['products'])===3, 'Customer-scoped listing failed');
    ensureInvoice($list['products'][0]['invoice_id']===$invoice['id'], 'Linked state missing');
    try { app(App\Services\CustomerService::class)->removeOwnedProduct(App\Models\Customer::find(1),1); throw new RuntimeException('Linked product deleted'); }
    catch (Illuminate\Validation\ValidationException) {}
    try { $upload(1,[],Illuminate\Http\UploadedFile::fake()->createWithContent('unsafe.html','<html>no</html>')); throw new RuntimeException('Invalid file accepted'); }
    catch (Illuminate\Validation\ValidationException) {}
    App\Models\CustomerInvoice::creating(function () { throw new RuntimeException('Simulated database failure'); });
    $before=count($disk->allFiles());
    try { $upload(1,[4]); throw new LogicException('Expected database error'); }
    catch (RuntimeException $e) { ensureInvoice($e->getMessage()==='Simulated database failure','Unexpected error'); }
    finally { App\Models\CustomerInvoice::flushEventListeners(); }
    ensureInvoice(count($disk->allFiles())===$before, 'Rollback left orphan file');
    ensureInvoice($db->table('customer_owned_products')->where('id',4)->value('customer_invoice_id')===null, 'Rollback linked product');
    try { $controller->destroy(2,$invoice['id']); throw new RuntimeException('Cross-customer delete allowed'); }
    catch(Illuminate\Database\Eloquent\ModelNotFoundException) {}
    $path=App\Models\CustomerInvoice::find($invoice['id'])->file_path;
    $controller->destroy(1,$invoice['id']);
    ensureInvoice(!App\Models\CustomerInvoice::find($invoice['id']) && !$disk->exists($path),'Invoice/file not deleted');
    ensureInvoice($db->table('customer_owned_products')->whereIn('id',[1,2])->whereNull('customer_invoice_id')->count()===2,'Products not preserved and unlinked');
    $upload(1,[1,2]);
    $migration->down();
    echo "PASS: invoice uploads/downloads, customer scoping, exclusive product linking, atomic failures and file cleanup.\n";
} finally {
    $disk->deleteDirectory('customer-invoices');
    if (is_dir($root)) rmdir($root);
}
