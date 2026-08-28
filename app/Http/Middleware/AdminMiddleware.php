<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware
{
    /**
     * Only allow requests from users with role = 'admin'.
     * This runs on the SERVER — hiding buttons on the frontend is NOT security.
     *
     * Usage on routes:
     *   Route::middleware(['auth:sanctum', 'admin'])->group(...)
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || $user->role !== 'admin') {
            return response()->json([
                'message' => 'Forbidden. Admin access required.',
            ], 403);
        }

        return $next($request);
    }
}
