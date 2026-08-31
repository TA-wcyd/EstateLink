<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Register a new normal user.
     * Role is always forced to 'user' — never accepted from input.
     *
     * POST /api/register
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'         => ['required', 'string', 'max:255'],
            'phone'        => ['required', 'string', 'max:30'],
            'email'        => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'national_id'  => ['required', 'string', 'max:50', 'unique:users,national_id'],
            'password'     => ['required', 'string', Password::min(8)->mixedCase()->numbers(), 'confirmed'],
            'facebook_url' => ['nullable', 'url', 'max:500'],
            'company_name' => ['nullable', 'string', 'max:255'],
        ]);

        // Role is ALWAYS forced server-side. Never trust client input for this.
        $user = User::create([
            'name'                => $validated['name'],
            'phone'               => $validated['phone'],
            'email'               => $validated['email'],
            'national_id'         => $validated['national_id'],
            'password'            => Hash::make($validated['password']),
            'facebook_url'        => $validated['facebook_url'] ?? null,
            'company_name'        => $validated['company_name'] ?? null,
            'role'                => 'user',            // hardcoded — never from request
            'verification_status' => 'pending',         // awaits admin approval
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Registration successful.',
            'token'   => $token,
            'token_type' => 'Bearer',
            'user'    => [
                'id'                  => $user->id,
                'name'                => $user->name,
                'email'               => $user->email,
                'phone'               => $user->phone,
                'role'                => $user->role,
                'verification_status' => $user->verification_status,
                'created_at'          => $user->created_at,
            ],
        ], 201);
    }

    /**
     * Log in a user (admin or normal user) and return a Sanctum token.
     *
     * POST /api/login
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        // Attempt authentication
        if (!Auth::attempt(['email' => $request->email, 'password' => $request->password])) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        /** @var User $user */
        $user = Auth::user();

        // Revoke all previous tokens so each device gets a fresh token
        $user->tokens()->delete();

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message'    => 'Login successful.',
            'token'      => $token,
            'token_type' => 'Bearer',
            'user'       => [
                'id'                  => $user->id,
                'name'                => $user->name,
                'email'               => $user->email,
                'phone'               => $user->phone,
                'role'                => $user->role,
                'verification_status' => $user->verification_status,
            ],
        ]);
    }

    /**
     * Log out the authenticated user by revoking their current token.
     *
     * POST /api/logout  (requires auth:sanctum)
     */
    public function logout(Request $request): JsonResponse
    {
        // Revoke only the token used for this request
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    /**
     * Return the currently authenticated user's profile.
     *
     * GET /api/me  (requires auth:sanctum)
     */
    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'user' => [
                'id'                  => $user->id,
                'name'                => $user->name,
                'email'               => $user->email,
                'phone'               => $user->phone,
                'national_id'         => $user->national_id,
                'facebook_url'        => $user->facebook_url,
                'company_name'        => $user->company_name,
                'role'                => $user->role,
                'verification_status' => $user->verification_status,
                'created_at'          => $user->created_at,
            ],
        ]);
    }
}
