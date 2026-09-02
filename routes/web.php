<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Frontend routes for EstateLink single-page application.
|
*/

// Public storage asset streaming fallback
Route::get('/storage/{path}', function (string $path) {
    if (!Storage::disk('public')->exists($path)) {
        abort(404);
    }
    return Storage::disk('public')->response($path);
})->where('path', '.*');

Route::get('/', function () {
    return view('welcome');
});

// SPA catch-all for frontend routes
Route::get('/{any}', function () {
    return view('welcome');
})->where('any', 'properties.*|properties|sell-property|my-properties|profile|admin.*');

