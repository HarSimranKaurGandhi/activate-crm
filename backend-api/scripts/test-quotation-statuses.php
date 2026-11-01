<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:']);
$db = Illuminate\Support\Facades\DB::connection();
$db->statement('CREATE TABLE quotations (id INTEGER PRIMARY KEY, status TEXT NOT NULL)');
$db->table('quotations')->insert([
    ['id' => 1, 'status' => 'shared_with_client'],
    ['id' => 2, 'status' => 'draft'],
]);
$migration = require __DIR__.'/../database/migrations/2026_10_07_000001_add_locked_and_executed_quotation_statuses.php';
$migration->up();
if ($db->table('quotations')->where('id', 1)->value('status') !== 'locked'
    || $db->table('quotations')->where('id', 2)->value('status') !== 'draft') {
    throw new RuntimeException('Migration failed to preserve existing statuses.');
}
$rules = (new App\Http\Requests\Quotations\QuotationStatusRequest())->rules();
$policy = new App\Policies\QuotationPolicy();
$user = new App\Models\User();
foreach (['locked', 'executed'] as $status) {
    if (Illuminate\Support\Facades\Validator::make(['status' => $status], $rules)->fails()) {
        throw new RuntimeException('New status rejected.');
    }
    $quotation = new App\Models\Quotation(['status' => $status]);
    if ($policy->update($user, $quotation)) {
        throw new RuntimeException('Finalized quotation can be edited.');
    }
}
if (!Illuminate\Support\Facades\Validator::make(['status' => 'shared_with_client'], $rules)->fails()) {
    throw new RuntimeException('Retired status still accepted.');
}
$db->table('quotations')->insert(['id' => 3, 'status' => 'executed']);
$service = app(App\Services\QuotationService::class);
foreach ([1 => 'locked', 3 => 'executed'] as $id => $status) {
    $stale = App\Models\Quotation::findOrFail($id);
    $stale->status = 'draft'; // Simulate an editor opened before the quotation was locked.
    try {
        $service->update($stale, ['status' => 'draft', 'items' => []]);
        throw new RuntimeException('Service allowed editing a finalized quotation.');
    } catch (Illuminate\Validation\ValidationException $exception) {
        if (!isset($exception->errors()['status'])) {
            throw new RuntimeException('Expected a status validation error.');
        }
    }
    if ($db->table('quotations')->where('id', $id)->value('status') !== $status) {
        throw new RuntimeException('Blocked edit modified the quotation.');
    }
}

foreach (['admin', 'sales', 'sales_manager', 'operations'] as $role) {
    $actor = new App\Models\User();
    $actor->setRelation('role', new App\Models\Role(['code' => $role, 'name' => $role]));
    $locked = App\Models\Quotation::findOrFail(1);
    foreach (['draft', 'pending_approval', 'approved', 'rejected', 'revised', 'locked', 'executed'] as $target) {
        $expected = $role === 'admin' || in_array($target, ['locked', 'executed'], true);
        if ($policy->changeStatus($actor, $locked, $target) !== $expected) {
            throw new RuntimeException("Unexpected locked transition permission: {$role} -> {$target}");
        }
    }
    if ($role !== 'admin') {
        $request = App\Http\Requests\Quotations\QuotationStatusRequest::create('/', 'PATCH', ['status' => 'draft']);
        $request->setValidator(Illuminate\Support\Facades\Validator::make(['status' => 'draft'], $rules));
        Illuminate\Support\Facades\Auth::setUser($actor);
        foreach (['status', 'revise'] as $action) {
            try {
                if ($action === 'status') {
                    app(App\Http\Controllers\Api\Quotations\QuotationController::class)->status($request, 1);
                } else {
                    app(App\Services\QuotationApprovalService::class)->revise(1, $actor, $request);
                }
                throw new RuntimeException("Non-admin {$role} could {$action} a locked quotation.");
            } catch (Illuminate\Auth\Access\AuthorizationException $exception) {
                // Both direct status updates and revisions must enforce the restriction.
            }
        }
        if ($db->table('quotations')->where('id', 1)->value('status') !== 'locked') {
            throw new RuntimeException('Unauthorized transition modified the quotation.');
        }
    }
}

$migration->down();
if ($db->table('quotations')->where('status', 'shared_with_client')->count() !== 2) {
    throw new RuntimeException('Rollback failed.');
}
echo "PASS: status migration, rollback, validation, edit restrictions and admin-only locked status decrements.\n";
