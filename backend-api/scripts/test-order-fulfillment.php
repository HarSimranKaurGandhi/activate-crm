<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:']);
$db = Illuminate\Support\Facades\DB::connection();
$db->statement('PRAGMA foreign_keys = ON');
$db->statement('CREATE TABLE quotations (id INTEGER PRIMARY KEY, created_by INTEGER, status TEXT)');
$db->statement('CREATE TABLE quotation_items (id INTEGER PRIMARY KEY, quotation_id INTEGER, quantity DECIMAL, FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE)');
$db->statement('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
$db->statement('CREATE TABLE quotation_user_shares (quotation_id INTEGER, user_id INTEGER)');
$migration = require __DIR__.'/../database/migrations/2026_10_19_000001_create_order_fulfillments_table.php';
$migration->up();
$db->table('quotations')->insert([
    ['id' => 1, 'created_by' => 1, 'status' => 'locked'],
    ['id' => 2, 'created_by' => 1, 'status' => 'draft'],
    ['id' => 3, 'created_by' => 1, 'status' => 'locked'],
]);
$db->table('quotation_items')->insert([
    ['id' => 1, 'quotation_id' => 1, 'quantity' => 100],
    ['id' => 2, 'quotation_id' => 1, 'quantity' => 1],
    ['id' => 3, 'quotation_id' => 1, 'quantity' => 1],
    ['id' => 4, 'quotation_id' => 2, 'quantity' => 1],
]);
$service = new class(app(App\Services\QuotationCalculator::class)) extends App\Services\QuotationService {
    public function find(int|string $id): App\Models\Quotation
    {
        $method = new ReflectionMethod(App\Services\QuotationService::class, 'visibleQuery');
        return $method->invoke($this, request())->findOrFail($id);
    }
};
$actor = new App\Models\User(['name' => 'Owner']);
$actor->id = 1;
$actor->setRelation('role', new App\Models\Role(['code' => 'sales', 'name' => 'Sales']));
$controller = new App\Http\Controllers\Api\Quotations\OrderFulfillmentController();
$save = function (int $quoteId, int $itemId, ?string $status, string $comment = '') use ($app, $controller, $service, &$actor) {
    $request = Illuminate\Http\Request::create('/', 'PUT', ['stock_status' => $status, 'stock_comment' => $comment]);
    $request->setUserResolver(fn () => $actor);
    $app->instance('request', $request);
    Illuminate\Support\Facades\Auth::setUser($actor);
    return $controller->update($request, $quoteId, $itemId, $service)->getData(true)['data'];
};
$bulk = function (int $quoteId, array $itemIds, array $updates) use ($app, $controller, $service, &$actor) {
    $request = Illuminate\Http\Request::create('/', 'PATCH', ['item_ids' => $itemIds] + $updates);
    $request->setUserResolver(fn () => $actor);
    $app->instance('request', $request);
    Illuminate\Support\Facades\Auth::setUser($actor);
    return $controller->bulkUpdate($request, $quoteId, $service)->getData(true)['data'];
};
$check = function (bool $condition, string $message): void {
    if (! $condition) throw new RuntimeException($message);
};
$check(App\Models\Quotation::find(1)->stockProgressPercent() === 0.0, 'Unset items must start at zero');
$check(App\Models\Quotation::find(3)->stockProgressPercent() === 0.0, 'Empty quote must return zero');
$result = $save(1, 1, 'stock_ready', 'All units in warehouse');
$check((float) $result['stock_progress_percent'] === 33.3, 'Progress must count rows, not quantities');
$check($result['fulfillment']['stock_comment'] === 'All units in warehouse', 'Comment not saved');
$save(1, 2, 'received');
$check(App\Models\Quotation::find(1)->stockProgressPercent() === 33.3, 'Received incorrectly counts as ready');
$save(1, 2, 'packed');
$result = $save(1, 3, 'stock_ready');
$check((float) $result['stock_progress_percent'] === 100.0, 'All ready items must yield 100%');
$save(1, 1, 'ordered', 'Waiting for replacement');
$check(App\Models\Quotation::find(1)->stockProgressPercent() === 66.7, 'Reverting stock must reduce progress');
$check($db->table('order_fulfillments')->count() === 3, 'Updates created duplicate rows');
$save(1, 1, null, '');
$check($db->table('order_fulfillments')->where('quotation_item_id', 1)->value('stock_status') === null, 'Cannot clear stock status');
$result = $save(1, 1, 'dispatched', 'Keep this comment');
$check((float) $result['stock_progress_percent'] === 100.0, 'Dispatched must count toward progress');
$bulk(1, [1, 2], ['stock_status' => 'ordered']);
$check($db->table('order_fulfillments')->where('quotation_item_id', 1)->value('stock_comment') === 'Keep this comment', 'Status-only update overwrote comment');
$check($db->table('order_fulfillments')->where('quotation_item_id', 3)->value('stock_status') === 'stock_ready', 'Unselected item was modified');
$bulk(1, [1, 2], ['stock_comment' => 'Common delivery note']);
$check($db->table('order_fulfillments')->where('quotation_item_id', 1)->value('stock_status') === 'ordered', 'Comment-only update overwrote status');
$check($db->table('order_fulfillments')->where('stock_comment', 'Common delivery note')->count() === 2, 'Common comment not applied');
$result = $bulk(1, [1, 2, 3], ['stock_status' => 'dispatched', 'stock_comment' => 'Sent together']);
$check(count($result['items']) === 3 && (float) $result['stock_progress_percent'] === 100.0, 'Select-all update failed');
$bulk(1, [1, 2], ['stock_comment' => '']);
$check($db->table('order_fulfillments')->where('quotation_item_id', 1)->value('stock_comment') === '', 'Cannot clear comments in bulk');
foreach ([[[], ['stock_status'=>'packed']], [[1,1], ['stock_status'=>'packed']], [[1], []], [[1], ['stock_status'=>'invalid']], [[1], ['stock_comment'=>str_repeat('x',2001)]], [[1,4], ['stock_status'=>'ordered']], [[1,999], ['stock_comment'=>'invalid']]] as [$ids, $updates]) {
    try { $bulk(1, $ids, $updates); throw new RuntimeException('Invalid bulk request accepted'); }
    catch (Illuminate\Validation\ValidationException) {}
}
$check($db->table('order_fulfillments')->where('quotation_item_id', 1)->value('stock_status') === 'dispatched', 'Failed bulk request partially updated a valid item');
foreach ([['invalid', ''], ['packed', str_repeat('x', 2001)]] as [$status, $comment]) {
    try {
        $save(1, 1, $status, $comment);
        throw new RuntimeException('Invalid stock input accepted');
    } catch (Illuminate\Validation\ValidationException) {}
}
try {
    $save(1, 4, 'packed');
    throw new RuntimeException('Item from another quote was updated');
} catch (Illuminate\Database\Eloquent\ModelNotFoundException) {}
foreach (['draft', 'approved', 'executed'] as $status) {
    $db->table('quotations')->where('id', 2)->update(['status' => $status]);
    try {
        $save(2, 4, 'packed');
        throw new RuntimeException('Non-locked quote was updated');
    } catch (Illuminate\Validation\ValidationException) {}
    try { $bulk(2, [4], ['stock_status'=>'dispatched']); throw new RuntimeException('Bulk update allowed non-locked quote'); }
    catch (Illuminate\Validation\ValidationException) {}
}
$actor->id = 99;
try {
    $save(1, 1, 'packed');
    throw new RuntimeException('Unrelated user could update stock');
} catch (Illuminate\Database\Eloquent\ModelNotFoundException) {}
try { $bulk(1, [1], ['stock_status'=>'packed']); throw new RuntimeException('Unrelated user could bulk-update stock'); }
catch (Illuminate\Database\Eloquent\ModelNotFoundException) {}
$actor->id = 1;
$actor->setRelation('role', new App\Models\Role(['code' => 'influencer']));
try {
    $save(1, 1, 'packed');
    throw new RuntimeException('Influencer could update stock');
} catch (Symfony\Component\HttpKernel\Exception\HttpException $exception) {
    $check($exception->getStatusCode() === 403, 'Expected forbidden response');
}
try { $bulk(1, [1], ['stock_status'=>'packed']); throw new RuntimeException('Influencer could bulk-update stock'); }
catch (Symfony\Component\HttpKernel\Exception\HttpException $exception) { $check($exception->getStatusCode() === 403, 'Expected forbidden bulk response'); }
$db->table('quotation_items')->where('id', 1)->delete();
$check($db->table('order_fulfillments')->count() === 2, 'Deleting item left fulfillment records');
$db->table('quotations')->where('id', 1)->delete();
$check($db->table('order_fulfillments')->count() === 0, 'Deleting quote left fulfillment records');
$migration->down();
echo "PASS: fulfillment persistence, row-based progress, validation, access, locked-only updates, dispatched progress, atomic bulk changes and cascade cleanup.\n";
