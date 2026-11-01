<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Services\LeaderboardService;
use App\Services\LeadService;

Artisan::command('about:quotation-api', function () {
    $this->info('Fitness quotation API backend is installed.');
});

Artisan::command('leaderboard:snapshot', function (LeaderboardService $leaderboard) {
    $count = $leaderboard->snapshotAll();
    $this->info("Saved {$count} leaderboard snapshot rows.");
})->purpose('Record today, week-to-date, and month-to-date leaderboard snapshots');

Artisan::command('leads:rollover-follow-ups {--date= : Process a specific date in YYYY-MM-DD format}', function (LeadService $leads) {
    $count = $leads->rolloverUnfollowedLeads($this->option('date'));
    $this->info("Moved {$count} unfollowed lead(s) to the next day.");
})->purpose('Move today\'s unfollowed open leads to tomorrow');

Schedule::command('leaderboard:snapshot')
    ->dailyAt('23:55')
    ->withoutOverlapping();

Schedule::command('leads:rollover-follow-ups')
    ->dailyAt('23:59')
    ->timezone('Asia/Kolkata')
    ->withoutOverlapping(10);
