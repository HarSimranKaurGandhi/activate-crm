<?php

use App\Http\Controllers\PublicStorageController;
use Illuminate\Support\Facades\Route;

/*
| Fallback for /storage/* when public/storage symlink is missing (common on shared hosting).
| If the symlink works, Apache/nginx serves files directly and this route is not hit.
*/
Route::get('/storage/{path}', [PublicStorageController::class, 'show'])
    ->where('path', '.*');
