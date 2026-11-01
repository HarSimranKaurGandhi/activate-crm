<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:']);
$db = Illuminate\Support\Facades\DB::connection();
$db->statement('CREATE TABLE quotation_items (
    id INTEGER PRIMARY KEY, quotation_id INTEGER NOT NULL, product_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL, tax_amount NUMERIC NOT NULL, line_total NUMERIC NOT NULL,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
)');
$updates = [];
for ($id = 1; $id <= 205; $id++) {
    $db->table('quotation_items')->insert([
        'id' => $id, 'quotation_id' => 7, 'product_name' => 'Item '.$id,
        'quantity' => 2, 'tax_amount' => 0, 'line_total' => 100,
        'created_at' => '2026-01-01 00:00:00', 'updated_at' => '2026-01-01 00:00:00',
    ]);
    $updates[] = ['id' => $id, 'tax_amount' => 23.54, 'line_total' => 159.89];
}
$db->table('quotation_items')->insert([
    'id' => 206, 'quotation_id' => 8, 'product_name' => 'Other quotation',
    'quantity' => 1, 'tax_amount' => 10, 'line_total' => 110,
    'created_at' => '2026-01-01 00:00:00', 'updated_at' => '2026-01-01 00:00:00',
]);
$updates[] = ['id' => 206, 'tax_amount' => 0, 'line_total' => 0];
$updates[] = ['id' => 999, 'tax_amount' => 0, 'line_total' => 0];
$quotation = new App\Models\Quotation();
$quotation->id = 7;
$method = new ReflectionMethod(App\Services\QuotationService::class, 'updateItemTaxTotals');
$service = app(App\Services\QuotationService::class);
$db->enableQueryLog();
$method->invoke($service, $quotation, $updates);
$queries = $db->getQueryLog();
if (count($queries) !== 3) {
    throw new RuntimeException('Expected three bounded batch updates.');
}
foreach ($queries as $query) {
    if (!str_starts_with($query['query'], 'UPDATE quotation_items')) {
        throw new RuntimeException('Tax recalculation must only update existing items.');
    }
}
foreach ($db->table('quotation_items')->where('quotation_id', 7)->get() as $item) {
    if ((float) $item->tax_amount !== 23.54 || (float) $item->line_total !== 159.89
        || $item->product_name !== 'Item '.$item->id || (int) $item->quantity !== 2
        || $item->created_at !== '2026-01-01 00:00:00'
        || $item->updated_at === $item->created_at) {
        throw new RuntimeException('Incorrect totals or modified item data.');
    }
}
if ($db->table('quotation_items')->count() !== 206
    || (float) $db->table('quotation_items')->where('id', 206)->value('tax_amount') !== 10.0) {
    throw new RuntimeException('Inserted missing item or changed another quotation.');
}
$db->flushQueryLog();
$method->invoke($service, $quotation, []);
if ($db->getQueryLog() !== []) {
    throw new RuntimeException('Empty update should not query the database.');
}
echo "PASS: batch totals, required fields, quotation scope, missing IDs, timestamps and empty updates.\n";
