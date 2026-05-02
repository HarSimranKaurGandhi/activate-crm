<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('about:quotation-api', function () {
    $this->info('Fitness quotation API backend is installed.');
});
