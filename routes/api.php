<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\UsersController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| All routes here are prefixed with /api automatically.
| Authentication uses Laravel Sanctum token-based auth.
|
*/

// ─────────────────────────────────────────────
//  Public Authentication Routes (no token needed)
// ─────────────────────────────────────────────
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

// ─────────────────────────────────────────────
//  Protected Routes (Bearer token required)
// ─────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me',      [AuthController::class, 'me']);

    // ─────────────────────────────────────────
    //  Admin-only Routes  (role = admin required)
    //  Always pair auth:sanctum + admin together.
    // ─────────────────────────────────────────
    Route::middleware('admin')->prefix('admin')->group(function () {
        // Placeholder — admin user management, verification, etc. come later
        Route::get('/dashboard', function () {
            return response()->json(['message' => 'Welcome, Admin.']);
        });
    });
});

// ─────────────────────────────────────────────
//  Legacy dummy CRUD routes (existing UsersController)
//  Keep these intact to not break existing functionality.
// ─────────────────────────────────────────────
Route::get('/items',         [UsersController::class, 'index']);
Route::get('/items/{id}',    [UsersController::class, 'show']);
Route::post('/items',        [UsersController::class, 'store']);
Route::put('/items/{id}',    [UsersController::class, 'update']);
Route::patch('/items/{id}',  [UsersController::class, 'patch']);
Route::delete('/items/{id}', [UsersController::class, 'destroy']);
