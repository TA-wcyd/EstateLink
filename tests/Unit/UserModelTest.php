<?php

namespace Tests\Unit;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserModelTest extends TestCase
{
    use RefreshDatabase;

    /* -----------------------------------------------------------------
     *  Role Helper Tests
     * ----------------------------------------------------------------- */

    public function test_is_admin_returns_true_for_admin_role(): void
    {
        $user = User::factory()->admin()->create();
        $this->assertTrue($user->isAdmin());
    }

    public function test_is_admin_returns_false_for_user_role(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $this->assertFalse($user->isAdmin());
    }

    public function test_is_user_returns_true_for_user_role(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $this->assertTrue($user->isUser());
    }

    public function test_is_user_returns_false_for_admin_role(): void
    {
        $user = User::factory()->admin()->create();
        $this->assertFalse($user->isUser());
    }

    /* -----------------------------------------------------------------
     *  Verification Status Helper Tests
     * ----------------------------------------------------------------- */

    public function test_is_verified_returns_true_when_verified(): void
    {
        $user = User::factory()->verified()->create();
        $this->assertTrue($user->isVerified());
    }

    public function test_is_verified_returns_false_when_pending(): void
    {
        $user = User::factory()->create(['verification_status' => 'pending']);
        $this->assertFalse($user->isVerified());
    }

    /* -----------------------------------------------------------------
     *  Hidden / Serialization Tests
     * ----------------------------------------------------------------- */

    public function test_password_is_hidden_from_serialization(): void
    {
        $user = User::factory()->create();
        $array = $user->toArray();

        $this->assertArrayNotHasKey('password', $array);
    }

    public function test_remember_token_is_hidden_from_serialization(): void
    {
        $user = User::factory()->create();
        $array = $user->toArray();

        $this->assertArrayNotHasKey('remember_token', $array);
    }

    /* -----------------------------------------------------------------
     *  Password Hashing Cast Test
     * ----------------------------------------------------------------- */

    public function test_password_is_hashed_via_cast(): void
    {
        $user = User::factory()->create(['password' => 'PlainTextPass1']);

        // The stored password should NOT be the plaintext value
        $this->assertNotEquals('PlainTextPass1', $user->getAttributes()['password']);

        // It should be a bcrypt hash (starts with $2y$)
        $this->assertStringStartsWith('$2y$', $user->getAttributes()['password']);
    }

    /* -----------------------------------------------------------------
     *  Relationship Tests
     * ----------------------------------------------------------------- */

    public function test_user_has_posts_relationship(): void
    {
        $user = User::factory()->create();
        $this->assertInstanceOf(\Illuminate\Database\Eloquent\Relations\HasMany::class, $user->posts());
    }

    public function test_user_has_properties_relationship(): void
    {
        $user = User::factory()->create();
        $this->assertInstanceOf(\Illuminate\Database\Eloquent\Relations\HasMany::class, $user->properties());
    }

    public function test_user_has_reviewed_properties_relationship(): void
    {
        $user = User::factory()->create();
        $this->assertInstanceOf(\Illuminate\Database\Eloquent\Relations\HasMany::class, $user->reviewedProperties());
    }

    /* -----------------------------------------------------------------
     *  Mass Assignment / Fillable Tests
     * ----------------------------------------------------------------- */

    public function test_fillable_attributes_include_expected_fields(): void
    {
        $user = new User();
        $expected = ['name', 'phone', 'email', 'national_id', 'password', 'facebook_url', 'company_name', 'role', 'verification_status'];

        foreach ($expected as $field) {
            $this->assertContains($field, $user->getFillable(), "Field '{$field}' should be fillable.");
        }
    }
}
