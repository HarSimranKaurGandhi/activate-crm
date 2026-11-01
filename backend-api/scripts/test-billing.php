<?php

// Standalone integration checks; all database writes go to a fresh in-memory SQLite connection.
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default' => 'billing_test', 'database.connections.billing_test' => [
    'driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '', 'foreign_key_constraints' => true,
], 'cache.default' => 'array', 'session.driver' => 'array']);

use App\Models\Dispatch;
use App\Models\Role;
use App\Models\TaxInvoice;
use App\Models\User;
use App\Services\InvoiceCalculator;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

Carbon::setTestNow('2026-09-05 10:00:00');
$checks = 0;
function check(bool $condition, string $message): void {
    global $checks;
    if (! $condition) throw new RuntimeException($message);
    $checks++;
}
function table(string $name, array $strings, array $numbers = []): void {
    Schema::create($name, function (Blueprint $table) use ($strings, $numbers) {
        $table->id();
        foreach ($strings as $column) $table->string($column)->nullable();
        foreach ($numbers as $column) $table->decimal($column, 16, 3)->nullable();
        $table->timestamps();
    });
}
table('users', ['name', 'email', 'password', 'designation', 'departments'], ['role_id']);
table('roles', ['name', 'code']);
table('user_module_permissions', ['module'], ['user_id', 'can_view', 'can_edit']);
$partyFields = ['company_name', 'gst_number', 'address_line_1', 'address_line_2', 'city', 'state', 'pincode', 'country', 'phone', 'email'];
table('customers', [...$partyFields, 'primary_name']);
table('company_settings', [...$partyFields, 'pan_number']);
table('company_bank_details', ['bank_name', 'account_name', 'account_number', 'ifsc_code', 'branch_name', 'upi_id'], ['company_setting_id', 'is_default']);
table('brands', ['name']);
table('measurement_units', ['code', 'name']);
table('products', ['product_name', 'model_number', 'unit', 'hsn_code'], ['brand_id', 'gst_percent']);
table('dispatches', ['dispatch_number', 'dispatch_date', 'planned_dispatch_date', 'status', 'invoice_path'], ['customer_id', 'created_by']);
table('dispatch_items', ['requirement', 'hsn_code'], ['dispatch_id', 'product_id', 'quantity', 'price', 'discount_percent', 'discounted_price', 'gst_percent']);
DB::table('users')->insert(['id' => 1, 'name' => 'Billing Tester', 'email' => 'billing@example.test']);
DB::table('user_module_permissions')->insert(['user_id' => 1, 'module' => 'dispatches', 'can_view' => 1, 'can_edit' => 1]);
$migration = require __DIR__.'/../database/migrations/2026_09_05_000001_create_tax_invoices.php';
$migration->up();
check(DB::table('user_module_permissions')->where('module', 'billing')->count() === 1, 'Migration must copy dispatch access to billing.');
DB::table('company_settings')->insert(['id' => 1, 'company_name' => 'Invoice Test Company', 'gst_number' => '07AAAAA0000A1Z5', 'state' => 'Delhi', 'address_line_1' => 'Test Seller Address']);
DB::table('customers')->insert(['id' => 1, 'primary_name' => 'Test Customer', 'company_name' => 'Example Buyer', 'state' => 'Haryana', 'gst_number' => '06BBBBB0000B1Z5', 'address_line_1' => 'Test Buyer Address']);
DB::table('brands')->insert(['id' => 1, 'name' => 'Example Brand']);
DB::table('measurement_units')->insert(['code' => 'PCS', 'name' => 'Pieces']);
DB::table('company_bank_details')->insert(['company_setting_id' => 1, 'bank_name' => 'Test Bank', 'account_name' => 'Invoice Test Company', 'account_number' => '1234567890', 'ifsc_code' => 'TEST0000001', 'branch_name' => 'Test Branch', 'is_default' => 1]);

$amounts = [2711.84, 3389.75, 762.71, 1525.42, 84.75, 150];
$hsns = ['95069190', '95069910', '9506', '950691', '95062900', '996511'];
foreach ($hsns as $index => $hsn) DB::table('products')->insert(['id' => $index + 1, 'product_name' => 'Test Product '.($index + 1), 'model_number' => 'MODEL-'.($index + 1), 'brand_id' => 1, 'unit' => 'PCS', 'hsn_code' => $hsn, 'gst_percent' => 18]);
function dispatchFixture(int $id, string $status = 'new', bool $missingHsn = false): void {
    global $amounts, $hsns;
    DB::table('dispatches')->insert(['id' => $id, 'customer_id' => 1, 'created_by' => 1, 'dispatch_number' => sprintf('DSP-2026-%05d', $id), 'dispatch_date' => '2026-09-05', 'planned_dispatch_date' => '2026-09-06', 'status' => $status]);
    foreach ($amounts as $index => $amount) DB::table('dispatch_items')->insert([
        'dispatch_id' => $id, 'requirement' => 'Test requirement '.($index + 1), 'product_id' => $missingHsn ? null : $index + 1,
        'hsn_code' => $missingHsn ? null : $hsns[$index], 'quantity' => 1, 'price' => $amount,
        'discount_percent' => 0, 'discounted_price' => $amount, 'gst_percent' => 18,
    ]);
}
dispatchFixture(1); dispatchFixture(2); dispatchFixture(3, 'cancelled'); dispatchFixture(4, 'invoiced'); dispatchFixture(5, 'dispatched'); dispatchFixture(6, 'new', true);
$actor = User::findOrFail(1);
$actor->setRelation('role', new Role(['name' => 'Admin', 'code' => 'admin']));
Auth::guard('sanctum')->setUser($actor);
function callApi(string $method, string $uri, array $payload = [], int $expected = 200): array {
    global $app;
    $request = Request::create('/api/'.$uri, $method, [], [], [], ['HTTP_ACCEPT' => 'application/json', 'CONTENT_TYPE' => 'application/json'], json_encode($payload));
    $response = $app->make(Illuminate\Contracts\Http\Kernel::class)->handle($request);
    check($response->getStatusCode() === $expected, "$method $uri expected $expected, received ".$response->getStatusCode().': '.substr($response->getContent(), 0, 1200));
    return json_decode($response->getContent(), true) ?? [];
}
$source = callApi('GET', 'billing/dispatches/1')['data'];
check($source['suggested_tax_mode'] === 'igst', 'Different states should suggest IGST.');
$payload = ['dispatch_id' => 1, 'source_token' => $source['source_token'], 'invoice_date' => '2026-09-05', 'tax_mode' => 'igst', 'place_of_supply' => 'Haryana', 'notes' => 'Payment due within 30 days.'];
$preview = callApi('POST', 'billing/invoices/preview', $payload)['data'];
check($preview['totals']['taxable_value'] === 8624.47 && $preview['totals']['tax_amount'] === 1552.42 && $preview['totals']['grand_total'] === 10176.89, 'Reference HSN table totals must match exactly.');
check(count($preview['hsn_summary']) === 6, 'Each HSN must appear in the summary.');
check($preview['items'][0]['unit'] === 'PCS', 'Invoice units must come from the product.');
check(TaxInvoice::count() === 0 && Dispatch::find(1)->status === 'new', 'Preview must not create an invoice or change dispatch status.');
$forced = callApi('POST', 'billing/invoices/preview', array_merge($payload, ['tax_mode' => 'cgst_sgst']))['data'];
check($forced['tax_mode'] === 'igst', 'Known non-Chandigarh state must enforce IGST.');
foreach ([' Chandigarh '=>'cgst_utgst', ''=>'cgst_sgst'] as $state=>$expectedMode) {
    DB::table('customers')->where('id',1)->update(['state'=>$state]);
    $updatedSource = app(App\Services\BillingService::class)->source(1);
    $split = callApi('POST','billing/invoices/preview',array_merge($payload,['source_token'=>$updatedSource['source_token'],'tax_mode'=>'cgst_sgst']))['data'];
    check($split['tax_mode']===$expectedMode, 'State selection or manual fallback failed.');
    check($split['totals']['igst_amount']===0 && $split['totals']['cgst_amount']===$split['totals']['sgst_amount'], 'Split taxes must be equal.');
    $html=view('pdf.tax-invoice',['invoice'=>$split+['invoice_number'=>'TEST']])->render();
    check(str_contains($html,$expectedMode==='cgst_utgst'?'UTGST':'SGST'), 'Local tax label missing.');
}
DB::table('customers')->where('id',1)->update(['state'=>'Haryana']);
$invoice = callApi('POST', 'billing/invoices', $payload, 201)['data'];
check($invoice['invoice_number'] === 'INV/26-27/00001', 'Invoice numbering must use the financial year.');
check(Dispatch::find(1)->status === 'invoiced', 'Conversion must mark the dispatch invoiced.');
callApi('POST', 'billing/invoices', $payload, 422);
check(TaxInvoice::count() === 1 && DB::table('invoice_sequences')->value('last_number') === 1, 'Duplicate conversion must not create a second invoice or consume a number.');
callApi('PATCH', 'dispatches/1/reopen', [], 422);
callApi('PATCH', 'dispatches/1/cancel', [], 422);
foreach ([3, 4, 5] as $id) callApi('GET', 'billing/dispatches/'.$id, [], 422);
callApi('POST', 'billing/invoices', [], 422);
callApi('POST', 'billing/invoices/preview', array_merge($payload, ['tax_mode' => 'invalid']), 422);
$listed = callApi('GET', 'billing/invoices')['data'];
check(count($listed) === 1 && $listed[0]['invoice_number'] === $invoice['invoice_number'], 'Saved invoice must be listed.');
$eligible = callApi('GET', 'billing/dispatches')['data'];
check(count($eligible) === 2, 'Only new unbilled dispatches should be eligible.');
$source2 = callApi('GET', 'billing/dispatches/2')['data'];
$payload2 = array_merge($payload, ['dispatch_id' => 2, 'source_token' => $source2['source_token']]);
DB::table('dispatch_items')->where('dispatch_id', 2)->update(['quantity' => 2]);
callApi('POST', 'billing/invoices', $payload2, 422);
check(Dispatch::find(2)->status === 'new', 'Stale preview must leave the dispatch unchanged.');
DB::table('customers')->where('id', 1)->update(['company_name' => 'Changed Buyer']);
DB::table('products')->where('id', 1)->update(['hsn_code' => '0000', 'product_name' => 'Changed Product']);
$saved = callApi('GET', 'billing/invoices/'.$invoice['id'])['data'];
check($saved['customer']['company_name'] === 'Example Buyer' && $saved['items'][0]['hsn_code'] === '95069190', 'Issued invoice snapshots must survive master data edits.');
$source6 = callApi('GET', 'billing/dispatches/6')['data'];
$payload6 = array_merge($payload, ['dispatch_id' => 6, 'source_token' => $source6['source_token']]);
callApi('POST', 'billing/invoices/preview', $payload6, 422);
$payload6['hsn_codes'] = array_map(fn ($item) => ['dispatch_item_id' => $item['dispatch_item_id'], 'hsn_code' => '996511'], $source6['items']);
$manual = callApi('POST', 'billing/invoices', $payload6, 201)['data'];
check(count($manual['hsn_summary']) === 1 && $manual['invoice_number'] === 'INV/26-27/00002', 'Missing HSN input must group correctly and assign the next invoice number.');
$calculator = app(InvoiceCalculator::class);
$rates = $calculator->calculate([
    ['hsn_code' => '9506', 'quantity' => 2, 'discounted_price' => 90, 'gst_percent' => 18],
    ['hsn_code' => '9506', 'quantity' => 1, 'discounted_price' => 50, 'gst_percent' => 12],
    ['hsn_code' => '9506', 'quantity' => 0.5, 'discounted_price' => 100, 'gst_percent' => 18],
    ['hsn_code' => '9965', 'quantity' => 1, 'discounted_price' => 0, 'gst_percent' => 0],
], 'igst');
check(count($rates['hsn_summary']) === 3 && $rates['totals']['taxable_value'] == 280 && $rates['totals']['tax_amount'] == 47.4, 'Group by HSN AND rate, support fractional quantities and zero tax.');

$html = view('pdf.tax-invoice', ['invoice' => $invoice])->render();
check(str_contains($html, '8,624.47') && str_contains($html, '1,552.42') && str_contains($html, '95069190'), 'PDF template must contain HSN and reference totals.');
$pdf = app('dompdf.wrapper')->loadHTML($html)->setPaper('a4')->output();
check(str_starts_with($pdf, '%PDF'), 'Invoice must render as a real PDF.');
$split['invoice_number'] = 'INV/26-27/TEST';
$splitHtml = view('pdf.tax-invoice', ['invoice' => $split])->render();
check(str_contains($splitHtml, 'CGST') && str_contains($splitHtml, 'SGST'), 'Split-tax PDF must show both tax heads.');
check(str_starts_with(app('dompdf.wrapper')->loadHTML($splitHtml)->setPaper('a4')->output(), '%PDF'), 'Split-tax invoice must render.');
if ($output = getenv('BILLING_TEST_OUTPUT')) {
    if (! is_dir($output)) throw new RuntimeException('Output directory must already exist.');
    file_put_contents($output.'/invoice.pdf', $pdf);
    file_put_contents($output.'/billing-fixture.json', json_encode(['source' => $source, 'preview' => $preview, 'invoice' => $invoice, 'split' => $split], JSON_PRETTY_PRINT));
}
$viewer = clone $actor;
$viewer->setRelation('role', new Role(['code' => 'operations']));
Auth::guard('sanctum')->setUser($viewer);
DB::table('user_module_permissions')->where('module', 'billing')->update(['can_edit' => 0]);
callApi('GET', 'billing/invoices');
callApi('POST', 'billing/invoices', $payload, 403);
DB::table('user_module_permissions')->where('module', 'billing')->update(['can_view' => 0]);
callApi('GET', 'billing/invoices', [], 403);
$migration->down();
check(! Schema::hasTable('tax_invoices'), 'Migration rollback must remove billing tables in the isolated database.');
echo "PASS: $checks billing checks (isolated SQLite; no production writes).\n";
