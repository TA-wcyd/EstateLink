<?php

namespace Tests\Feature;

use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PropertyApiTest extends TestCase
{
    use RefreshDatabase;

    /* =====================================================================
     *  PUBLIC LISTING TESTS — GET /api/properties
     * ===================================================================== */

    public function test_public_list_returns_only_approved_properties(): void
    {
        $user = User::factory()->create();
        Property::factory()->approved()->count(2)->create(['user_id' => $user->id]);
        Property::factory()->pending()->create(['user_id' => $user->id]);
        Property::factory()->rejected()->create(['user_id' => $user->id]);

        $response = $this->getJson('/api/properties');

        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
    }

    public function test_public_list_filters_by_property_type(): void
    {
        $user = User::factory()->create();
        Property::factory()->approved()->create(['user_id' => $user->id, 'property_type' => 'apartment']);
        Property::factory()->approved()->create(['user_id' => $user->id, 'property_type' => 'villa']);

        $response = $this->getJson('/api/properties?property_type=apartment');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('apartment', $response->json('data.0.property_type'));
    }

    public function test_public_list_filters_by_min_price(): void
    {
        $user = User::factory()->create();
        Property::factory()->approved()->create(['user_id' => $user->id, 'price' => 5000000]);
        Property::factory()->approved()->create(['user_id' => $user->id, 'price' => 15000000]);

        $response = $this->getJson('/api/properties?min_price=10000000');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }

    public function test_public_list_filters_by_max_price(): void
    {
        $user = User::factory()->create();
        Property::factory()->approved()->create(['user_id' => $user->id, 'price' => 5000000]);
        Property::factory()->approved()->create(['user_id' => $user->id, 'price' => 15000000]);

        $response = $this->getJson('/api/properties?max_price=10000000');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }

    public function test_public_list_filters_by_bedrooms(): void
    {
        $user = User::factory()->create();
        Property::factory()->approved()->create(['user_id' => $user->id, 'bedrooms' => 2]);
        Property::factory()->approved()->create(['user_id' => $user->id, 'bedrooms' => 4]);

        $response = $this->getJson('/api/properties?bedrooms=3');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }

    public function test_public_list_filters_by_transaction_status(): void
    {
        $user = User::factory()->create();
        Property::factory()->approved()->create(['user_id' => $user->id, 'transaction_status' => 'available']);
        Property::factory()->approved()->create(['user_id' => $user->id, 'transaction_status' => 'sold']);

        $response = $this->getJson('/api/properties?transaction_status=available');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }

    public function test_public_list_is_paginated(): void
    {
        $user = User::factory()->create();
        Property::factory()->approved()->count(15)->create(['user_id' => $user->id]);

        $response = $this->getJson('/api/properties?per_page=5');

        $response->assertStatus(200)
                 ->assertJsonStructure(['data', 'current_page', 'last_page', 'per_page', 'total']);
        $this->assertCount(5, $response->json('data'));
        $this->assertEquals(15, $response->json('total'));
    }

    /* =====================================================================
     *  PUBLIC SHOW TESTS — GET /api/properties/{id}
     * ===================================================================== */

    public function test_public_show_approved_property_returns_200(): void
    {
        $user = User::factory()->create();
        $property = Property::factory()->approved()->create(['user_id' => $user->id]);

        $response = $this->getJson("/api/properties/{$property->id}");

        $response->assertStatus(200)
                 ->assertJsonPath('property.id', $property->id);
    }

    public function test_public_show_pending_property_returns_404(): void
    {
        $user = User::factory()->create();
        $property = Property::factory()->pending()->create(['user_id' => $user->id]);

        $response = $this->getJson("/api/properties/{$property->id}");

        $response->assertStatus(404);
    }

    public function test_public_show_rejected_property_returns_404(): void
    {
        $user = User::factory()->create();
        $property = Property::factory()->rejected()->create(['user_id' => $user->id]);

        $response = $this->getJson("/api/properties/{$property->id}");

        $response->assertStatus(404);
    }

    public function test_public_show_nonexistent_id_returns_404(): void
    {
        $response = $this->getJson('/api/properties/999999');

        $response->assertStatus(404);
    }

    /* =====================================================================
     *  CREATE PROPERTY TESTS — POST /api/properties
     * ===================================================================== */

    public function test_create_property_authenticated_returns_201(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/properties', [
            'title' => 'Test Property',
            'property_type' => 'apartment',
            'description' => 'A lovely apartment with garden view.',
            'price' => 5000000,
            'size' => 1500,
            'bedrooms' => 3,
            'bathrooms' => 2,
            'location' => 'Dhaka',
            'address' => '123 Test Street, Dhaka',
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('property.verification_status', 'pending')
                 ->assertJsonPath('property.title', 'Test Property');
    }

    public function test_create_property_unauthenticated_returns_401(): void
    {
        $response = $this->postJson('/api/properties', [
            'title' => 'Test Property',
            'property_type' => 'apartment',
            'description' => 'A lovely apartment.',
            'price' => 5000000,
            'size' => 1500,
            'location' => 'Dhaka',
            'address' => '123 Test Street',
        ]);

        $response->assertStatus(401);
    }

    public function test_create_property_missing_title_returns_422(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/properties', [
            'property_type' => 'apartment',
            'description' => 'Description text here.',
            'price' => 5000000,
            'size' => 1500,
            'location' => 'Dhaka',
            'address' => '123 Test Street',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['title']);
    }

    public function test_create_property_invalid_property_type_returns_422(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/properties', [
            'title' => 'Test',
            'property_type' => 'mansion',  // invalid — not in enum
            'description' => 'Description text here.',
            'price' => 5000000,
            'size' => 1500,
            'location' => 'Dhaka',
            'address' => '123 Test Street',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['property_type']);
    }

    /* ----- Boundary: price min:0 ----- */

    public function test_create_property_price_zero_passes(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/properties', [
            'title' => 'Free Land',
            'property_type' => 'land',
            'description' => 'A free plot of land.',
            'price' => 0,
            'size' => 500,
            'location' => 'Rural',
            'address' => 'Open Field',
        ]);

        $response->assertStatus(201);
    }

    public function test_create_property_price_negative_fails(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/properties', [
            'title' => 'Negative Price',
            'property_type' => 'apartment',
            'description' => 'Description text here.',
            'price' => -1,
            'size' => 1500,
            'location' => 'Dhaka',
            'address' => '123 Test Street',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['price']);
    }

    /* ----- Boundary: size min:1 ----- */

    public function test_create_property_size_below_1_fails(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/properties', [
            'title' => 'Tiny',
            'property_type' => 'apartment',
            'description' => 'Description text here.',
            'price' => 100000,
            'size' => 0.99,
            'location' => 'Dhaka',
            'address' => '123 Test Street',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['size']);
    }

    public function test_create_property_size_exactly_1_passes(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/properties', [
            'title' => 'Minimal Size',
            'property_type' => 'studio',
            'description' => 'A tiny studio apartment.',
            'price' => 100000,
            'size' => 1,
            'location' => 'Dhaka',
            'address' => '123 Test Street',
        ]);

        $response->assertStatus(201);
    }

    /* ----- Boundary: bedrooms min:0, max:50 ----- */

    public function test_create_property_bedrooms_51_fails(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/properties', [
            'title' => 'Huge House',
            'property_type' => 'house',
            'description' => 'A very large house.',
            'price' => 100000000,
            'size' => 50000,
            'bedrooms' => 51,
            'location' => 'Dhaka',
            'address' => '123 Test Street',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['bedrooms']);
    }

    public function test_create_property_bedrooms_50_passes(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/properties', [
            'title' => 'Very Large House',
            'property_type' => 'house',
            'description' => 'A very large house.',
            'price' => 100000000,
            'size' => 50000,
            'bedrooms' => 50,
            'location' => 'Dhaka',
            'address' => '123 Test Street',
        ]);

        $response->assertStatus(201);
    }

    public function test_create_property_bedrooms_0_passes(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/properties', [
            'title' => 'Studio No Bedrooms',
            'property_type' => 'studio',
            'description' => 'A studio with zero bedrooms.',
            'price' => 100000,
            'size' => 500,
            'bedrooms' => 0,
            'location' => 'Dhaka',
            'address' => '123 Test Street',
        ]);

        $response->assertStatus(201);
    }

    public function test_create_property_bedrooms_negative_fails(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/properties', [
            'title' => 'Negative Bedrooms',
            'property_type' => 'apartment',
            'description' => 'Invalid bedroom count.',
            'price' => 100000,
            'size' => 500,
            'bedrooms' => -1,
            'location' => 'Dhaka',
            'address' => '123 Test Street',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['bedrooms']);
    }

    /* ----- Boundary: bathrooms min:0, max:50 ----- */

    public function test_create_property_bathrooms_51_fails(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/properties', [
            'title' => 'Too Many Bathrooms',
            'property_type' => 'house',
            'description' => 'Way too many bathrooms.',
            'price' => 100000000,
            'size' => 50000,
            'bathrooms' => 51,
            'location' => 'Dhaka',
            'address' => '123 Test Street',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['bathrooms']);
    }

    /* ----- Boundary: description min:5 ----- */

    public function test_create_property_description_4_chars_fails(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/properties', [
            'title' => 'Short Desc',
            'property_type' => 'apartment',
            'description' => 'Abcd',  // 4 chars, min is 5
            'price' => 100000,
            'size' => 500,
            'location' => 'Dhaka',
            'address' => '123 Test Street',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['description']);
    }

    public function test_create_property_description_5_chars_passes(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/properties', [
            'title' => 'Min Desc',
            'property_type' => 'apartment',
            'description' => 'Abcde',  // 5 chars
            'price' => 100000,
            'size' => 500,
            'location' => 'Dhaka',
            'address' => '123 Test Street',
        ]);

        $response->assertStatus(201);
    }

    /* ----- Boundary: title max:255 ----- */

    public function test_create_property_title_256_chars_fails(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/properties', [
            'title' => str_repeat('X', 256),
            'property_type' => 'apartment',
            'description' => 'Valid description here.',
            'price' => 100000,
            'size' => 500,
            'location' => 'Dhaka',
            'address' => '123 Test Street',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['title']);
    }

    public function test_create_property_title_255_chars_passes(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/properties', [
            'title' => str_repeat('X', 255),
            'property_type' => 'apartment',
            'description' => 'Valid description here.',
            'price' => 100000,
            'size' => 500,
            'location' => 'Dhaka',
            'address' => '123 Test Street',
        ]);

        $response->assertStatus(201);
    }

    /* =====================================================================
     *  MY PROPERTIES TESTS — GET /api/my-properties
     * ===================================================================== */

    public function test_my_properties_returns_only_own_properties(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        Property::factory()->count(3)->create(['user_id' => $userA->id]);
        Property::factory()->count(2)->create(['user_id' => $userB->id]);

        Sanctum::actingAs($userA);

        $response = $this->getJson('/api/my-properties');

        $response->assertStatus(200)
                 ->assertJsonPath('summary.total', 3);
    }

    public function test_my_properties_unauthenticated_returns_401(): void
    {
        $response = $this->getJson('/api/my-properties');
        $response->assertStatus(401);
    }

    /* =====================================================================
     *  SHOW MY PROPERTY — GET /api/my-properties/{id}
     * ===================================================================== */

    public function test_show_my_property_own_returns_200(): void
    {
        $user = User::factory()->create();
        $property = Property::factory()->create(['user_id' => $user->id]);
        Sanctum::actingAs($user);

        $response = $this->getJson("/api/my-properties/{$property->id}");

        $response->assertStatus(200)
                 ->assertJsonPath('property.id', $property->id);
    }

    public function test_show_my_property_other_users_returns_404(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();
        $property = Property::factory()->create(['user_id' => $userB->id]);

        Sanctum::actingAs($userA);

        $response = $this->getJson("/api/my-properties/{$property->id}");

        $response->assertStatus(404);
    }

    /* =====================================================================
     *  UPDATE PROPERTY — PUT /api/my-properties/{id}
     * ===================================================================== */

    public function test_update_own_property_returns_200(): void
    {
        $user = User::factory()->create();
        $property = Property::factory()->create(['user_id' => $user->id]);
        Sanctum::actingAs($user);

        $response = $this->putJson("/api/my-properties/{$property->id}", [
            'title' => 'Updated Title',
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('property.title', 'Updated Title');
    }

    public function test_update_other_users_property_returns_404(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();
        $property = Property::factory()->create(['user_id' => $userB->id]);

        Sanctum::actingAs($userA);

        $response = $this->putJson("/api/my-properties/{$property->id}", [
            'title' => 'Hijacked Title',
        ]);

        $response->assertStatus(404);
    }

    /* =====================================================================
     *  DELETE PROPERTY — DELETE /api/my-properties/{id}
     * ===================================================================== */

    public function test_delete_own_property_returns_200(): void
    {
        $user = User::factory()->create();
        $property = Property::factory()->create(['user_id' => $user->id]);
        Sanctum::actingAs($user);

        $response = $this->deleteJson("/api/my-properties/{$property->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('properties', ['id' => $property->id]);
    }

    public function test_delete_other_users_property_returns_404(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();
        $property = Property::factory()->create(['user_id' => $userB->id]);

        Sanctum::actingAs($userA);

        $response = $this->deleteJson("/api/my-properties/{$property->id}");

        $response->assertStatus(404);
        $this->assertDatabaseHas('properties', ['id' => $property->id]);
    }

    /* =====================================================================
     *  RESUBMIT PROPERTY — POST /api/my-properties/{id}/resubmit
     * ===================================================================== */

    public function test_resubmit_rejected_property_resets_to_pending(): void
    {
        $user = User::factory()->create();
        $property = Property::factory()->rejected()->create(['user_id' => $user->id]);
        Sanctum::actingAs($user);

        $response = $this->postJson("/api/my-properties/{$property->id}/resubmit");

        $response->assertStatus(200);
        $this->assertDatabaseHas('properties', [
            'id' => $property->id,
            'verification_status' => 'pending',
        ]);
    }

    /* =====================================================================
     *  FILE UPLOAD TESTS
     * ===================================================================== */

    public function test_create_property_with_image_upload(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/properties', [
            'title' => 'Property With Image',
            'property_type' => 'apartment',
            'description' => 'Has an image attached.',
            'price' => 5000000,
            'size' => 1500,
            'location' => 'Dhaka',
            'address' => '123 Test Street',
            'images' => [UploadedFile::fake()->image('photo.jpg', 800, 600)],
        ]);

        $response->assertStatus(201);
        $this->assertNotEmpty($response->json('property.images'));
    }

    public function test_create_property_with_invalid_file_type_fails(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/properties', [
            'title' => 'Invalid Image Type',
            'property_type' => 'apartment',
            'description' => 'Trying to upload a non-image.',
            'price' => 5000000,
            'size' => 1500,
            'location' => 'Dhaka',
            'address' => '123 Test Street',
            'images' => [UploadedFile::fake()->create('malware.exe', 100)],
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['images.0']);
    }

    /* ----- Valid property types ----- */

    public function test_all_valid_property_types_accepted(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $types = ['apartment', 'house', 'land', 'commercial', 'villa', 'duplex', 'studio', 'other'];

        foreach ($types as $index => $type) {
            $response = $this->postJson('/api/properties', [
                'title' => "Property Type {$type}",
                'property_type' => $type,
                'description' => "Testing property type {$type}.",
                'price' => 1000000,
                'size' => 500,
                'location' => 'Dhaka',
                'address' => '123 Test Street',
            ]);

            $response->assertStatus(201, "Property type '{$type}' should be accepted but was rejected.");
        }
    }
}
