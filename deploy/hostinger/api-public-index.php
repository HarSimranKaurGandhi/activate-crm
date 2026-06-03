<?php

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

/*
|--------------------------------------------------------------------------
| Hostinger public_html front controller
|--------------------------------------------------------------------------
|
| Put this file at:
|   ~/domains/crmapi.activatefitnessstore.com/public_html/index.php
|
| Keep the full Laravel app outside public_html at:
|   ~/domains/crmapi.activatefitnessstore.com/laravel
|
*/

if (file_exists($maintenance = __DIR__.'/../../laravel/storage/framework/maintenance.php')) {
    require $maintenance;
}

require __DIR__.'/../../laravel/vendor/autoload.php';

$app = require_once __DIR__.'/../../laravel/bootstrap/app.php';

$app->handleRequest(Request::capture());
