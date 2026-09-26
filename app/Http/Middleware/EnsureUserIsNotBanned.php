<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsNotBanned
{
    /**
     * Check if the authenticated user is banned.
     * If banned, invalidate all active tokens and return 403.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->is_banned) {
            // Revoke active tokens immediately
            $user->tokens()->delete();

            return response()->json([
                'message'    => 'Your account has been permanently suspended due to violation of platform policies.',
                'ban_reason' => $user->ban_reason,
                'banned'     => true,
            ], 403);
        }

        return $next($request);
    }
}
