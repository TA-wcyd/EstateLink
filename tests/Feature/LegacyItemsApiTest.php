<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tests for legacy /api/items routes (UsersController).
 *
 * SECURITY FINDING: These routes have NO authentication middleware.
 * GET /api/items returns all users with their posts — exposing PII (emails, etc.).
 */
class LegacyItemsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_items_index_accessible_without_auth(): void
    {
        // Create some users so there's data to leak
        User::factory()->count(3)->create();

        $response = $this->getJson('/api/items');

        // This SHOULD ideally return 401, but it returns 200 — documenting as security finding
        $response->assertStatus(200);
    }

    public function test_items_show_accessible_without_auth(): void
    {
        $response = $this->getJson('/api/items/1');

        $response->assertStatus(200);
    }

    public function test_items_store_accessible_without_auth(): void
    {
        $response = $this->postJson('/api/items', [
            'name' => 'Test Item',
            'description' => 'Test description',
        ]);

        $response->assertStatus(201);
    }

    public function test_items_update_accessible_without_auth(): void
    {
        $response = $this->putJson('/api/items/1', [
            'name' => 'Updated Item',
        ]);

        $response->assertStatus(200);
    }

    public function test_items_patch_accessible_without_auth(): void
    {
        $response = $this->patchJson('/api/items/1', [
            'name' => 'Patched Item',
        ]);

        $response->assertStatus(200);
    }

    public function test_items_delete_accessible_without_auth(): void
    {
        $response = $this->deleteJson('/api/items/1');

        $response->assertStatus(200);
    }

    /**
     * CRITICAL: GET /api/items exposes all user records with associated posts.
     * This test documents that user emails and personal data are returned.
     */
    public function test_items_index_exposes_user_emails(): void
    {
        User::factory()->create(['email' => 'exposed@example.com']);

        $response = $this->getJson('/api/items');

        $response->assertStatus(200);

        // The response contains user data including email
        $content = $response->getContent();
        $this->assertStringContainsString('exposed@example.com', $content,
            'SECURITY: GET /api/items exposes user email addresses without authentication.');
    }
}
