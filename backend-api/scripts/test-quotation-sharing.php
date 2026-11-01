<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:']);
$db = Illuminate\Support\Facades\DB::connection();
$db->statement('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, role_id INTEGER, is_active INTEGER)');
$db->statement('CREATE TABLE roles (id INTEGER PRIMARY KEY, name TEXT, code TEXT)');
$db->statement('CREATE TABLE quotations (id INTEGER PRIMARY KEY, created_by INTEGER, status TEXT, updated_at TEXT)');
$migration = require __DIR__.'/../database/migrations/2026_09_28_000001_create_quotation_user_shares_table.php';
$migration->up();
$db->table('roles')->insert([['id'=>1,'name'=>'Admin','code'=>'admin'], ['id'=>2,'name'=>'Sales','code'=>'sales']]);
foreach ([1,2,3,4] as $id) {
    $db->table('users')->insert(['id'=>$id, 'name'=>'User '.$id, 'role_id'=>$id===1?1:2, 'is_active'=>1]);
}
$db->table('quotations')->insert([['id'=>1,'created_by'=>2,'status'=>'draft'], ['id'=>2,'created_by'=>4,'status'=>'draft']]);
$quotation = App\Models\Quotation::findOrFail(1);
$owner = App\Models\User::findOrFail(2);
$recipient = App\Models\User::findOrFail(3);
$other = App\Models\User::findOrFail(4);
$admin = App\Models\User::findOrFail(1);
$policy = new App\Policies\QuotationPolicy();
$service = app(App\Services\QuotationService::class);
$visible = new ReflectionMethod($service, 'visibleQuery');
function check(bool $passed, string $message): void {
    if (!$passed) throw new RuntimeException($message);
}
function visibleIds($user): array {
    global $service, $visible;
    $request = Illuminate\Http\Request::create('/');
    $request->setUserResolver(fn () => $user);
    return $visible->invoke($service, $request)->orderBy('id')->pluck('id')->all();
}
check(visibleIds($recipient) === [], 'Unshared quotation was visible');
$quotation->sharedUsers()->sync([$recipient->id]);
check(visibleIds($recipient) === [1], 'Shared quotation missing from recipient list');
check(visibleIds($owner) === [1], 'Owner lost access');
check(visibleIds($other) === [2], 'Unrelated user gained access');
check(visibleIds($admin) === [1,2], 'Admin lost access');
check($policy->view($recipient, $quotation), 'Recipient cannot preview');
check($policy->update($recipient, $quotation), 'Recipient cannot edit draft');
check(!$policy->manageSharing($recipient, $quotation), 'Recipient can reshare/delete');
check($policy->manageSharing($owner, $quotation), 'Owner cannot manage sharing');
check(Illuminate\Support\Facades\Gate::forUser($owner)->allows('manageSharing', $quotation), 'Sharing policy not discovered');
$quotation->sharedUsers()->sync([$recipient->id]);
check($quotation->sharedUsers()->count() === 1, 'Repeated sharing created duplicates');
$quotation->sharedUsers()->sync([]);
check(visibleIds($recipient) === [], 'Revoked user can still access quotation');
check(!$policy->view($recipient, $quotation), 'Revoked user can still preview');
// Exercise the controller using the actual visibility query and isolated fixtures.
$controllerService = new class(app(App\Services\QuotationCalculator::class)) extends App\Services\QuotationService {
    public function find(int|string $id): App\Models\Quotation
    {
        $method = new ReflectionMethod(App\Services\QuotationService::class, 'visibleQuery');
        return $method->invoke($this, request())->findOrFail($id);
    }
};
$controller = new App\Http\Controllers\Api\Quotations\QuotationController($controllerService);
$shareAs = function ($actor, array $ids) use ($app, $controller) {
    $request = Illuminate\Http\Request::create('/', 'PUT', ['user_ids' => $ids]);
    $request->setUserResolver(fn () => $actor);
    $app->instance('request', $request);
    Illuminate\Support\Facades\Auth::setUser($actor);
    return $controller->share($request, 1);
};
check($shareAs($owner, [3])->getStatusCode() === 200, 'Owner cannot save sharing');
check(visibleIds($recipient) === [1], 'Saved share not visible');
try {
    $shareAs($recipient, [4]);
    throw new RuntimeException('Recipient was allowed to reshare');
} catch (Illuminate\Auth\Access\AuthorizationException) {
}
foreach ([[999], [2], [3,3]] as $invalid) {
    try {
        $shareAs($owner, $invalid);
        throw new RuntimeException('Invalid recipient accepted');
    } catch (Illuminate\Validation\ValidationException) {
    }
}
$db->table('users')->where('id', 4)->update(['is_active' => 0]);
try {
    $shareAs($owner, [4]);
    throw new RuntimeException('New inactive recipient accepted');
} catch (Illuminate\Validation\ValidationException) {
}
$db->table('users')->where('id', 3)->update(['is_active' => 0]);
check($shareAs($owner, [3])->getStatusCode() === 200, 'Existing inactive share cannot be retained');
check($shareAs($owner, [])->getStatusCode() === 200, 'Owner cannot revoke sharing');
check(visibleIds($recipient) === [], 'Controller failed to revoke visibility');
$quotation->sharedUsers()->sync([$recipient->id]);
$quotation->delete();
check($db->table('quotation_user_shares')->count() === 0, 'Deleting quotation leaves orphan shares');
echo "Passed sharing visibility, preview/edit permissions, owner/admin access, revocation, duplicate sharing, and cascade cleanup.\n";
