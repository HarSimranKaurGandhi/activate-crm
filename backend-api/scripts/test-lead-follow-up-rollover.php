<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

config(['database.default' => 'rollover_test', 'database.connections.rollover_test' => [
    'driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '', 'foreign_key_constraints' => true,
]]);

use App\Models\ActivityLog;
use App\Models\Lead;
use App\Services\LeadService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

Schema::create('leads', function (Blueprint $table): void {
    $table->id();
    $table->string('status');
    $table->date('follow_up_date')->nullable();
    $table->timestamps();
});
Schema::create('activity_logs', function (Blueprint $table): void {
    $table->id();
    $table->string('module');
    $table->string('entity_type');
    $table->unsignedBigInteger('entity_id');
    $table->string('action');
    $table->text('description')->nullable();
    $table->json('old_values')->nullable();
    $table->json('new_values')->nullable();
    $table->unsignedBigInteger('user_id')->nullable();
    $table->unsignedBigInteger('created_by')->nullable();
    $table->string('ip_address')->nullable();
    $table->timestamps();
});

foreach ([
    ['status' => 'new', 'follow_up_date' => '2026-12-31'],
    ['status' => 'proposal', 'follow_up_date' => '2026-12-31'],
    ['status' => 'closed_success', 'follow_up_date' => '2026-12-31'],
    ['status' => 'closed_fail', 'follow_up_date' => '2026-12-31'],
    ['status' => 'new', 'follow_up_date' => '2026-12-30'],
    ['status' => 'new', 'follow_up_date' => '2027-01-01'],
    ['status' => 'new', 'follow_up_date' => null],
] as $lead) Lead::create($lead);

$service = app(LeadService::class);
$count = $service->rolloverUnfollowedLeads('2026-12-31');
if ($count !== 2) throw new RuntimeException("Expected 2 leads to roll over; received {$count}.");
if (Lead::whereDate('follow_up_date', '2027-01-01')->count() !== 3) throw new RuntimeException('Open due leads were not moved to the next calendar day.');
if (Lead::whereIn('status', ['closed_success', 'closed_fail'])->whereDate('follow_up_date', '2026-12-31')->count() !== 2) throw new RuntimeException('Closed leads must remain unchanged.');
if (Lead::whereDate('follow_up_date', '2026-12-30')->count() !== 1) throw new RuntimeException('Older overdue leads must remain unchanged.');
if (ActivityLog::where('action', 'follow_up_rolled_over')->count() !== 2) throw new RuntimeException('Every rollover must be audited.');
if ($service->rolloverUnfollowedLeads('2026-12-31') !== 0) throw new RuntimeException('Rerunning the batch for the same date must be idempotent.');

echo "PASS: lead follow-up rollover updates only today's open leads, records history, crosses year-end, and is idempotent.\n";
