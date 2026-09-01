<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Frontend routes for EstateLink single-page application.
|
*/

Route::get('/', function () {
    return view('welcome');
});

// SPA catch-all for frontend routes
Route::get('/{any}', function () {
    return view('welcome');
})->where('any', 'properties.*|properties|sell-property|my-properties|profile|admin.*');
