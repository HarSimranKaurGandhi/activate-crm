<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Services\LeaderboardService;

Artisan::command('about:quotation-api', function () {
    $this->info('Fitness quotation API backend is installed.');
});

Artisan::command('leaderboard:snapshot', function (LeaderboardService $leaderboard) {
    $count = $leaderboard->snapshotAll();
    $this->info("Saved {$count} leaderboard snapshot rows.");
})->purpose('Record today, week-to-date, and month-to-date leaderboard snapshots');

Schedule::command('leaderboard:snapshot')
    ->dailyAt('23:55')
    ->withoutOverlapping();
