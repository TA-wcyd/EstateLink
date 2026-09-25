<?php

namespace Tests\Feature;

use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminApiTest extends TestCase
{
    use RefreshDatabase;

    /* =====================================================================
     *  ADMIN DASHBOARD — GET /api/admin/dashboard
     * ===================================================================== */

    public function test_admin_dashboard_as_admin_returns_200(): void
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/admin/dashboard');

        $response->assertStatus(200)
                 ->assertJsonPath('message', 'Welcome, Admin.');
    }

    public function test_admin_dashboard_as_normal_user_returns_403(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/admin/dashboard');

        $response->assertStatus(403);
    }

    public function test_admin_dashboard_unauthenticated_returns_401(): void
    {
        $response = $this->getJson('/api/admin/dashboard');

        $response->assertStatus(401);
    }

    /* =====================================================================
     *  PENDING PROPERTIES — GET /api/admin/properties/pending
     * ===================================================================== */

    public function test_pending_list_as_admin_returns_200(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();
        Property::factory()->pending()->count(3)->create(['user_id' => $user->id]);
        Property::factory()->approved()->create(['user_id' => $user->id]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/admin/properties/pending');

        $response->assertStatus(200);
        $this->assertEquals(3, $response->json('total'));
    }

    public function test_pending_list_as_normal_user_returns_403(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/admin/properties/pending');

        $response->assertStatus(403);
    }

    /* =====================================================================
     *  ALL PROPERTIES — GET /api/admin/properties/all
     * ===================================================================== */

    public function test_all_properties_as_admin_returns_200(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();
        Property::factory()->count(5)->create(['user_id' => $user->id]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/admin/properties/all');

        $response->assertStatus(200);
        $this->assertEquals(5, $response->json('total'));
    }

    public function test_all_properties_as_normal_user_returns_403(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/admin/properties/all');

        $response->assertStatus(403);
    }

    public function test_all_properties_filters_by_status(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();
        Property::factory()->approved()->count(2)->create(['user_id' => $user->id]);
        Property::factory()->pending()->count(3)->create(['user_id' => $user->id]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/admin/properties/all?status=approved');

        $response->assertStatus(200);
        $this->assertEquals(2, $response->json('total'));
    }

    /* =====================================================================
     *  SHOW VERIFICATION — GET /api/admin/properties/{id}/verification
     * ===================================================================== */

    public function test_show_verification_as_admin_returns_200(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();
        $property = Property::factory()->pending()->create(['user_id' => $user->id]);

        Sanctum::actingAs($admin);

        $response = $this->getJson("/api/admin/properties/{$property->id}/verification");

        $response->assertStatus(200)
                 ->assertJsonStructure(['property', 'documents']);
    }

    public function test_show_verification_nonexistent_returns_404(): void
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/admin/properties/999999/verification');

        $response->assertStatus(404);
    }

    public function test_show_verification_as_user_returns_403(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $property = Property::factory()->pending()->create(['user_id' => $user->id]);

        Sanctum::actingAs($user);

        $response = $this->getJson("/api/admin/properties/{$property->id}/verification");

        $response->assertStatus(403);
    }

    /* =====================================================================
     *  APPROVE PROPERTY — POST /api/admin/properties/{id}/approve
     * ===================================================================== */

    public function test_approve_as_admin_changes_status_to_approved(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();
        $property = Property::factory()->pending()->create(['user_id' => $user->id]);

        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/admin/properties/{$property->id}/approve");

        $response->assertStatus(200);
        $this->assertDatabaseHas('properties', [
            'id' => $property->id,
            'verification_status' => 'approved',
            'reviewed_by' => $admin->id,
        ]);
    }

    public function test_approve_as_normal_user_returns_403(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $property = Property::factory()->pending()->create(['user_id' => $user->id]);

        Sanctum::actingAs($user);

        $response = $this->postJson("/api/admin/properties/{$property->id}/approve");

        $response->assertStatus(403);
    }

    public function test_approve_nonexistent_property_returns_404(): void
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/admin/properties/999999/approve');

        $response->assertStatus(404);
    }

    /* =====================================================================
     *  REJECT PROPERTY — POST /api/admin/properties/{id}/reject
     * ===================================================================== */

    public function test_reject_as_admin_with_reason_changes_status(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();
        $property = Property::factory()->pending()->create(['user_id' => $user->id]);

        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/admin/properties/{$property->id}/reject", [
            'rejection_reason' => 'The NID scan was blurry and unreadable.',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('properties', [
            'id' => $property->id,
            'verification_status' => 'rejected',
            'rejection_reason' => 'The NID scan was blurry and unreadable.',
            'reviewed_by' => $admin->id,
        ]);
    }

    public function test_reject_without_reason_returns_422(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();
        $property = Property::factory()->pending()->create(['user_id' => $user->id]);

        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/admin/properties/{$property->id}/reject", []);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['rejection_reason']);
    }

    /* ----- Boundary: rejection_reason min:5 ----- */

    public function test_reject_reason_4_chars_fails(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();
        $property = Property::factory()->pending()->create(['user_id' => $user->id]);

        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/admin/properties/{$property->id}/reject", [
            'rejection_reason' => 'Abcd',  // 4 chars, min is 5
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['rejection_reason']);
    }

    public function test_reject_reason_5_chars_passes(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();
        $property = Property::factory()->pending()->create(['user_id' => $user->id]);

        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/admin/properties/{$property->id}/reject", [
            'rejection_reason' => 'Abcde',  // 5 chars
        ]);

        $response->assertStatus(200);
    }

    public function test_reject_reason_2001_chars_fails(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();
        $property = Property::factory()->pending()->create(['user_id' => $user->id]);

        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/admin/properties/{$property->id}/reject", [
            'rejection_reason' => str_repeat('A', 2001),  // over max:2000
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['rejection_reason']);
    }

    public function test_reject_reason_2000_chars_passes(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();
        $property = Property::factory()->pending()->create(['user_id' => $user->id]);

        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/admin/properties/{$property->id}/reject", [
            'rejection_reason' => str_repeat('A', 2000),
        ]);

        $response->assertStatus(200);
    }

    public function test_reject_as_normal_user_returns_403(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $property = Property::factory()->pending()->create(['user_id' => $user->id]);

        Sanctum::actingAs($user);

        $response = $this->postJson("/api/admin/properties/{$property->id}/reject", [
            'rejection_reason' => 'Should not work.',
        ]);

        $response->assertStatus(403);
    }

    /* =====================================================================
     *  FULL WORKFLOW: submit → approve → visible publicly
     * ===================================================================== */

    public function test_full_workflow_submit_approve_appears_publicly(): void
    {
        $admin = User::factory()->admin()->create();
        $seller = User::factory()->create();

        // 1. Seller creates property
        Sanctum::actingAs($seller);
        $createResponse = $this->postJson('/api/properties', [
            'title' => 'Workflow Test Property',
            'property_type' => 'house',
            'description' => 'End-to-end workflow test property.',
            'price' => 10000000,
            'size' => 2000,
            'bedrooms' => 3,
            'bathrooms' => 2,
            'location' => 'Dhaka',
            'address' => 'Workflow Test Street',
        ]);
        $createResponse->assertStatus(201);
        $propertyId = $createResponse->json('property.id');

        // 2. Property should NOT appear in public list (pending)
        $publicResponse = $this->getJson('/api/properties');
        $publicIds = collect($publicResponse->json('data'))->pluck('id')->toArray();
        $this->assertNotContains($propertyId, $publicIds);

        // 3. Admin approves property
        Sanctum::actingAs($admin);
        $approveResponse = $this->postJson("/api/admin/properties/{$propertyId}/approve");
        $approveResponse->assertStatus(200);

        // 4. Property should NOW appear in public list
        $publicResponse2 = $this->getJson('/api/properties');
        $publicIds2 = collect($publicResponse2->json('data'))->pluck('id')->toArray();
        $this->assertContains($propertyId, $publicIds2);
    }

    /* =====================================================================
     *  FULL WORKFLOW: submit → reject → resubmit → approve
     * ===================================================================== */

    public function test_full_workflow_submit_reject_resubmit_approve(): void
    {
        $admin = User::factory()->admin()->create();
        $seller = User::factory()->create();

        // 1. Create property
        Sanctum::actingAs($seller);
        $createResponse = $this->postJson('/api/properties', [
            'title' => 'Reject-Resubmit Test',
            'property_type' => 'apartment',
            'description' => 'Testing the reject and resubmit flow.',
            'price' => 5000000,
            'size' => 1000,
            'location' => 'Dhaka',
            'address' => '456 Test Road',
        ]);
        $propertyId = $createResponse->json('property.id');

        // 2. Admin rejects
        Sanctum::actingAs($admin);
        $rejectResponse = $this->postJson("/api/admin/properties/{$propertyId}/reject", [
            'rejection_reason' => 'Missing NID document.',
        ]);
        $rejectResponse->assertStatus(200);
        $this->assertDatabaseHas('properties', ['id' => $propertyId, 'verification_status' => 'rejected']);

        // 3. Seller resubmits
        Sanctum::actingAs($seller);
        $resubmitResponse = $this->postJson("/api/my-properties/{$propertyId}/resubmit");
        $resubmitResponse->assertStatus(200);
        $this->assertDatabaseHas('properties', ['id' => $propertyId, 'verification_status' => 'pending']);

        // 4. Admin approves
        Sanctum::actingAs($admin);
        $approveResponse = $this->postJson("/api/admin/properties/{$propertyId}/approve");
        $approveResponse->assertStatus(200);
        $this->assertDatabaseHas('properties', ['id' => $propertyId, 'verification_status' => 'approved']);
    }
}
