<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    /* =====================================================================
     *  REGISTRATION TESTS
     * ===================================================================== */

    public function test_register_with_valid_data_returns_201(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Test User',
            'phone' => '01712345678',
            'email' => 'testuser@example.com',
            'national_id' => '1234567890',
            'password' => 'Password1',
            'password_confirmation' => 'Password1',
        ]);

        $response->assertStatus(201)
                 ->assertJsonStructure([
                     'message', 'token', 'token_type',
                     'user' => ['id', 'name', 'email', 'phone', 'role', 'verification_status'],
                 ]);

        $this->assertEquals('user', $response->json('user.role'));
        $this->assertEquals('pending', $response->json('user.verification_status'));
        $this->assertDatabaseHas('users', ['email' => 'testuser@example.com', 'role' => 'user']);
    }

    public function test_register_missing_name_returns_422(): void
    {
        $response = $this->postJson('/api/register', [
            'phone' => '01712345678',
            'email' => 'test@example.com',
            'national_id' => '1234567890',
            'password' => 'Password1',
            'password_confirmation' => 'Password1',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['name']);
    }

    public function test_register_missing_email_returns_422(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Test',
            'phone' => '01712345678',
            'national_id' => '1234567890',
            'password' => 'Password1',
            'password_confirmation' => 'Password1',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['email']);
    }

    public function test_register_missing_phone_returns_422(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Test',
            'email' => 'test@example.com',
            'national_id' => '1234567890',
            'password' => 'Password1',
            'password_confirmation' => 'Password1',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['phone']);
    }

    public function test_register_missing_national_id_returns_422(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Test',
            'phone' => '01712345678',
            'email' => 'test@example.com',
            'password' => 'Password1',
            'password_confirmation' => 'Password1',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['national_id']);
    }

    public function test_register_missing_password_returns_422(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Test',
            'phone' => '01712345678',
            'email' => 'test@example.com',
            'national_id' => '1234567890',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['password']);
    }

    /* ----- Password Boundary Tests ----- */

    public function test_register_password_7_chars_fails(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Test',
            'phone' => '01712345678',
            'email' => 'test@example.com',
            'national_id' => '1234567890',
            'password' => 'Pass1ab',   // 7 chars
            'password_confirmation' => 'Pass1ab',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['password']);
    }

    public function test_register_password_8_chars_valid_passes(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Test',
            'phone' => '01712345678',
            'email' => 'test8@example.com',
            'national_id' => '1234567891',
            'password' => 'Pass1abc',  // 8 chars, mixed case, number
            'password_confirmation' => 'Pass1abc',
        ]);

        $response->assertStatus(201);
    }

    public function test_register_password_no_uppercase_fails(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Test',
            'phone' => '01712345678',
            'email' => 'test@example.com',
            'national_id' => '1234567890',
            'password' => 'password1',  // no uppercase
            'password_confirmation' => 'password1',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['password']);
    }

    public function test_register_password_no_number_fails(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Test',
            'phone' => '01712345678',
            'email' => 'test@example.com',
            'national_id' => '1234567890',
            'password' => 'Passwordd',  // no number
            'password_confirmation' => 'Passwordd',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['password']);
    }

    public function test_register_password_no_lowercase_fails(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Test',
            'phone' => '01712345678',
            'email' => 'test@example.com',
            'national_id' => '1234567890',
            'password' => 'PASSWORD1',  // no lowercase
            'password_confirmation' => 'PASSWORD1',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['password']);
    }

    public function test_register_password_confirmation_mismatch_fails(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Test',
            'phone' => '01712345678',
            'email' => 'test@example.com',
            'national_id' => '1234567890',
            'password' => 'Password1',
            'password_confirmation' => 'Different1',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['password']);
    }

    /* ----- Duplicate Tests ----- */

    public function test_register_duplicate_email_fails(): void
    {
        User::factory()->create(['email' => 'dupe@example.com']);

        $response = $this->postJson('/api/register', [
            'name' => 'Another User',
            'phone' => '01712345678',
            'email' => 'dupe@example.com',
            'national_id' => '9999999999',
            'password' => 'Password1',
            'password_confirmation' => 'Password1',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['email']);
    }

    public function test_register_duplicate_national_id_fails(): void
    {
        User::factory()->create(['national_id' => 'DUPE-NID-001']);

        $response = $this->postJson('/api/register', [
            'name' => 'Another User',
            'phone' => '01712345678',
            'email' => 'unique@example.com',
            'national_id' => 'DUPE-NID-001',
            'password' => 'Password1',
            'password_confirmation' => 'Password1',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['national_id']);
    }

    /* ----- Role Injection Test ----- */

    public function test_register_role_injection_is_ignored(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Sneaky User',
            'phone' => '01712345678',
            'email' => 'sneaky@example.com',
            'national_id' => '1111111111',
            'password' => 'Password1',
            'password_confirmation' => 'Password1',
            'role' => 'admin',  // Attempt to inject admin role
        ]);

        $response->assertStatus(201);
        $this->assertEquals('user', $response->json('user.role'));
        $this->assertDatabaseHas('users', ['email' => 'sneaky@example.com', 'role' => 'user']);
    }

    /* ----- Invalid Email Format ----- */

    public function test_register_invalid_email_format_fails(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Test',
            'phone' => '01712345678',
            'email' => 'not-an-email',
            'national_id' => '1234567890',
            'password' => 'Password1',
            'password_confirmation' => 'Password1',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['email']);
    }

    /* ----- Boundary: name max:255 ----- */

    public function test_register_name_256_chars_fails(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => str_repeat('A', 256),
            'phone' => '01712345678',
            'email' => 'long@example.com',
            'national_id' => '1234567890',
            'password' => 'Password1',
            'password_confirmation' => 'Password1',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['name']);
    }

    /* =====================================================================
     *  LOGIN TESTS
     * ===================================================================== */

    public function test_login_with_valid_credentials_returns_200(): void
    {
        User::factory()->create([
            'email' => 'login@example.com',
            'password' => 'Password1',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'login@example.com',
            'password' => 'Password1',
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure(['message', 'token', 'token_type', 'user']);
    }

    public function test_login_wrong_password_returns_422(): void
    {
        User::factory()->create([
            'email' => 'login@example.com',
            'password' => 'Password1',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'login@example.com',
            'password' => 'WrongPassword1',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['email']);
    }

    public function test_login_non_existent_email_returns_422(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => 'nonexistent@example.com',
            'password' => 'Password1',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['email']);
    }

    public function test_login_missing_email_returns_422(): void
    {
        $response = $this->postJson('/api/login', [
            'password' => 'Password1',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['email']);
    }

    public function test_login_missing_password_returns_422(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => 'test@example.com',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['password']);
    }

    /* =====================================================================
     *  ME ENDPOINT TESTS
     * ===================================================================== */

    public function test_me_with_valid_token_returns_200(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/me');

        $response->assertStatus(200)
                 ->assertJsonPath('user.id', $user->id)
                 ->assertJsonPath('user.email', $user->email)
                 ->assertJsonPath('user.role', $user->role);
    }

    public function test_me_without_token_returns_401(): void
    {
        $response = $this->getJson('/api/me');

        $response->assertStatus(401);
    }

    /* =====================================================================
     *  LOGOUT TESTS
     * ===================================================================== */

    public function test_logout_with_valid_token_returns_200(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/logout');

        $response->assertStatus(200)
                 ->assertJsonPath('message', 'Logged out successfully.');
    }

    public function test_logout_without_token_returns_401(): void
    {
        $response = $this->postJson('/api/logout');

        $response->assertStatus(401);
    }

    /* =====================================================================
     *  TOKEN REVOCATION TEST
     * ===================================================================== */

    public function test_login_revokes_previous_tokens(): void
    {
        $user = User::factory()->create([
            'email' => 'revoke@example.com',
            'password' => 'Password1',
        ]);

        // First login
        $response1 = $this->postJson('/api/login', [
            'email' => 'revoke@example.com',
            'password' => 'Password1',
        ]);
        $token1 = $response1->json('token');

        // Second login — should revoke first token
        $response2 = $this->postJson('/api/login', [
            'email' => 'revoke@example.com',
            'password' => 'Password1',
        ]);
        $token2 = $response2->json('token');

        // First token should no longer work
        $meResponse = $this->withHeader('Authorization', 'Bearer ' . $token1)
                           ->getJson('/api/me');
        $meResponse->assertStatus(401);

        // Second token should work
        $meResponse2 = $this->withHeader('Authorization', 'Bearer ' . $token2)
                            ->getJson('/api/me');
        $meResponse2->assertStatus(200);
    }

    /* =====================================================================
     *  SANCTUM TOKEN GENERATION TEST
     * ===================================================================== */

    public function test_register_returns_valid_bearer_token(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Token Test',
            'phone' => '01712345678',
            'email' => 'tokentest@example.com',
            'national_id' => '5555555555',
            'password' => 'Password1',
            'password_confirmation' => 'Password1',
        ]);

        $token = $response->json('token');
        $this->assertNotEmpty($token);
        $this->assertEquals('Bearer', $response->json('token_type'));

        // Use the returned token to access /api/me
        $meResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
                           ->getJson('/api/me');
        $meResponse->assertStatus(200)
                   ->assertJsonPath('user.email', 'tokentest@example.com');
    }
}
