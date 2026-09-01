<?php

use App\Http\Controllers\AdminPropertyController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PropertyController;
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
Route::post('/login',    [AuthController::class, 'login'])->name('login');

// ─────────────────────────────────────────────
//  Public Property Routes (no token needed)
//  STRICT RULE: ONLY approved properties returned.
// ─────────────────────────────────────────────
Route::get('/properties',      [PropertyController::class, 'index']);
Route::get('/properties/{id}', [PropertyController::class, 'show']);

// ─────────────────────────────────────────────
//  Protected Routes (Bearer token required)
// ─────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Auth session
    Route::post('/logout',  [AuthController::class, 'logout']);
    Route::get('/me',       [AuthController::class, 'me']);
    Route::put('/profile',  [AuthController::class, 'updateProfile']);
    Route::post('/profile', [AuthController::class, 'updateProfile']);

    // ─────────────────────────────────────────
    //  Seller / Property Management Endpoints
    //  (Any authenticated normal user can list/manage their properties)
    // ─────────────────────────────────────────
    Route::post('/properties',                                  [PropertyController::class, 'store']);
    Route::get('/my-properties',                                [PropertyController::class, 'myProperties']);
    Route::get('/my-properties/{id}',                           [PropertyController::class, 'showMyProperty']);
    Route::put('/my-properties/{id}',                           [PropertyController::class, 'update']);
    Route::post('/my-properties/{id}',                          [PropertyController::class, 'update']); // for multipart form data
    Route::delete('/my-properties/{id}',                        [PropertyController::class, 'destroy']);
    Route::post('/my-properties/{id}/resubmit',                 [PropertyController::class, 'resubmit']);
    Route::delete('/my-properties/{id}/images/{imageId}',       [PropertyController::class, 'deleteImage']);

    // ─────────────────────────────────────────
    //  Admin-only Routes (role = admin required)
    // ─────────────────────────────────────────
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/dashboard', function () {
            return response()->json(['message' => 'Welcome, Admin.']);
        });

        // Property Verification Workflow
        Route::get('/properties/pending',                                                [AdminPropertyController::class, 'pending']);
        Route::get('/properties/all',                                                    [AdminPropertyController::class, 'all']);
        Route::get('/properties/{id}/verification',                                      [AdminPropertyController::class, 'showVerification']);
        Route::get('/properties/{propertyId}/documents/{documentId}/download',            [AdminPropertyController::class, 'downloadDocument']);
        Route::post('/properties/{id}/approve',                                          [AdminPropertyController::class, 'approve']);
        Route::post('/properties/{id}/reject',                                           [AdminPropertyController::class, 'reject']);
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
