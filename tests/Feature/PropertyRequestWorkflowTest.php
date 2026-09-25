<?php

namespace Tests\Feature;

use App\Enums\PropertyRequestStatus;
use App\Models\Property;
use App\Models\PropertyRequest;
use App\Models\PropertySale;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PropertyRequestWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
    }

    private function createBuyer(): User
    {
        return User::factory()->create([
            'role'                => 'user',
            'verification_status' => 'verified',
        ]);
    }

    private function createSeller(): User
    {
        return User::factory()->create([
            'role'                => 'user',
            'verification_status' => 'verified',
        ]);
    }

    private function createAdmin(): User
    {
        return User::factory()->create([
            'role'                => 'admin',
            'verification_status' => 'verified',
        ]);
    }

    private function createApprovedProperty(User $seller): Property
    {
        return Property::create([
            'user_id'             => $seller->id,
            'title'               => 'Test Luxury Flat in Gulshan',
            'property_type'       => 'apartment',
            'description'         => 'Exclusive test flat for purchase request workflow testing.',
            'price'               => 15000000,
            'size'                => 1800,
            'bedrooms'            => 3,
            'bathrooms'           => 3,
            'location'            => 'Gulshan 1, Dhaka',
            'address'             => 'Road 12, House 5',
            'phone'               => '01711112222',
            'verification_status' => 'approved',
            'transaction_status'  => 'available',
            'submitted_at'        => now(),
            'reviewed_at'         => now(),
        ]);
    }

    /**
     * Test 1: Buyer can submit purchase request for available property.
     * Enforces PRIVACY RULE: Seller phone/email is NOT returned in the buyer response.
     */
    public function test_buyer_can_submit_purchase_request_with_privacy_rule()
    {
        $buyer = $this->createBuyer();
        $seller = $this->createSeller();
        $property = $this->createApprovedProperty($seller);

        $response = $this->actingAs($buyer)
            ->postJson("/api/properties/{$property->id}/requests", [
                'offered_amount' => 14500000,
                'preferred_date' => now()->addDays(3)->format('Y-m-d'),
                'buyer_notes'    => 'Interested in viewing this flat over the weekend.',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('request.offered_amount', 14500000)
            ->assertJsonPath('request.status', PropertyRequestStatus::PENDING_SELLER_APPROVAL->value)
            ->assertJsonMissing(['phone' => $seller->phone])
            ->assertJsonMissing(['email' => $seller->email]);

        $this->assertDatabaseHas('property_requests', [
            'property_id'    => $property->id,
            'buyer_id'       => $buyer->id,
            'seller_id'      => $seller->id,
            'offered_amount' => 14500000,
            'status'         => PropertyRequestStatus::PENDING_SELLER_APPROVAL->value,
        ]);
    }

    /**
     * Test 2: Buyer cannot submit request on their own property.
     */
    public function test_buyer_cannot_submit_request_on_own_property()
    {
        $seller = $this->createSeller();
        $property = $this->createApprovedProperty($seller);

        $response = $this->actingAs($seller)
            ->postJson("/api/properties/{$property->id}/requests", [
                'offered_amount' => 14000000,
                'preferred_date' => now()->addDays(2)->format('Y-m-d'),
            ]);

        $response->assertStatus(403);
    }

    /**
     * Test 3: Buyer cannot submit a second active request on the same property.
     */
    public function test_buyer_cannot_submit_duplicate_active_request()
    {
        $buyer = $this->createBuyer();
        $seller = $this->createSeller();
        $property = $this->createApprovedProperty($seller);

        PropertyRequest::create([
            'property_id'    => $property->id,
            'buyer_id'       => $buyer->id,
            'seller_id'      => $seller->id,
            'offered_amount' => 14000000,
            'preferred_date' => now()->addDays(2),
            'status'         => PropertyRequestStatus::PENDING_SELLER_APPROVAL,
        ]);

        $response = $this->actingAs($buyer)
            ->postJson("/api/properties/{$property->id}/requests", [
                'offered_amount' => 14200000,
                'preferred_date' => now()->addDays(4)->format('Y-m-d'),
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'You already have an active request for this property.');
    }

    /**
     * Test 4: Seller can view incoming requests with privacy (no buyer phone/email/NID).
     */
    public function test_seller_can_view_requests_with_strict_privacy()
    {
        $buyer = $this->createBuyer();
        $seller = $this->createSeller();
        $property = $this->createApprovedProperty($seller);

        PropertyRequest::create([
            'property_id'    => $property->id,
            'buyer_id'       => $buyer->id,
            'seller_id'      => $seller->id,
            'offered_amount' => 14000000,
            'preferred_date' => now()->addDays(2),
            'buyer_notes'    => 'Buyer note without contact info',
            'status'         => PropertyRequestStatus::PENDING_SELLER_APPROVAL,
        ]);

        $response = $this->actingAs($seller)
            ->getJson('/api/seller/requests');

        $response->assertStatus(200)
            ->assertJsonPath('data.0.buyer.name', $buyer->name)
            ->assertJsonMissing(['phone' => $buyer->phone])
            ->assertJsonMissing(['email' => $buyer->email])
            ->assertJsonMissing(['national_id' => $buyer->national_id]);
    }

    /**
     * Test 5: Seller can decline request.
     */
    public function test_seller_can_decline_request()
    {
        $buyer = $this->createBuyer();
        $seller = $this->createSeller();
        $property = $this->createApprovedProperty($seller);

        $request = PropertyRequest::create([
            'property_id'    => $property->id,
            'buyer_id'       => $buyer->id,
            'seller_id'      => $seller->id,
            'offered_amount' => 13000000,
            'preferred_date' => now()->addDays(2),
            'status'         => PropertyRequestStatus::PENDING_SELLER_APPROVAL,
        ]);

        $response = $this->actingAs($seller)
            ->postJson("/api/seller/requests/{$request->id}/decline", [
                'seller_notes' => 'Offered price is below our acceptable range.',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('request.status', PropertyRequestStatus::DECLINED_BY_SELLER->value);

        $this->assertDatabaseHas('property_requests', [
            'id'     => $request->id,
            'status' => PropertyRequestStatus::DECLINED_BY_SELLER->value,
        ]);
    }

    /**
     * Test 6: Seller can forward request to admin, and Locking Rule (§5) blocks forwarding a second request.
     */
    public function test_seller_forward_and_locking_rule()
    {
        $buyer1 = $this->createBuyer();
        $buyer2 = $this->createBuyer();
        $seller = $this->createSeller();
        $property = $this->createApprovedProperty($seller);

        $req1 = PropertyRequest::create([
            'property_id'    => $property->id,
            'buyer_id'       => $buyer1->id,
            'seller_id'      => $seller->id,
            'offered_amount' => 14000000,
            'preferred_date' => now()->addDays(2),
            'status'         => PropertyRequestStatus::PENDING_SELLER_APPROVAL,
        ]);

        $req2 = PropertyRequest::create([
            'property_id'    => $property->id,
            'buyer_id'       => $buyer2->id,
            'seller_id'      => $seller->id,
            'offered_amount' => 14500000,
            'preferred_date' => now()->addDays(3),
            'status'         => PropertyRequestStatus::PENDING_SELLER_APPROVAL,
        ]);

        // Forward 1st request -> should succeed
        $res1 = $this->actingAs($seller)
            ->postJson("/api/seller/requests/{$req1->id}/forward", [
                'seller_notes' => 'Forwarding to admin for inspection.',
            ]);

        $res1->assertStatus(200)
            ->assertJsonPath('request.status', PropertyRequestStatus::FORWARDED_TO_ADMIN->value);

        // Forward 2nd request -> MUST fail because 1st request is already in admin pipeline
        $res2 = $this->actingAs($seller)
            ->postJson("/api/seller/requests/{$req2->id}/forward");

        $res2->assertStatus(422)
            ->assertJsonFragment([
                'active_forwarded_request_id' => $req1->id,
            ]);
    }

    /**
     * Test 7: Admin workflow - sequential steps: Schedule -> Complete Inspection -> Confirm Sale.
     */
    public function test_admin_sequential_workflow_to_confirmed_sale()
    {
        $buyer = $this->createBuyer();
        $seller = $this->createSeller();
        $admin = $this->createAdmin();
        $property = $this->createApprovedProperty($seller);

        $request = PropertyRequest::create([
            'property_id'    => $property->id,
            'buyer_id'       => $buyer->id,
            'seller_id'      => $seller->id,
            'offered_amount' => 14800000,
            'preferred_date' => now()->addDays(2),
            'status'         => PropertyRequestStatus::FORWARDED_TO_ADMIN,
        ]);

        // Step 4 attempted prematurely -> should fail because schedule not fixed yet
        $prematureComplete = $this->actingAs($admin)
            ->postJson("/api/admin/requests/{$request->id}/complete-inspection", [
                'inspection_findings' => 'Findings attempted before schedule.',
            ]);
        $prematureComplete->assertStatus(422);

        // Step 5 attempted prematurely -> should fail because inspection not completed
        $prematureSale = $this->actingAs($admin)
            ->postJson("/api/admin/requests/{$request->id}/confirm-sale");
        $prematureSale->assertStatus(422);

        // Admin Step 3: Fix schedule
        $scheduleRes = $this->actingAs($admin)
            ->postJson("/api/admin/requests/{$request->id}/schedule", [
                'inspection_scheduled_at' => now()->addDays(2)->format('Y-m-d H:i:s'),
                'inspection_notes'        => 'Meeting scheduled with licensed surveyor on site.',
            ]);
        $scheduleRes->assertStatus(200)
            ->assertJsonPath('request.status', PropertyRequestStatus::SCHEDULE_FIXED->value);

        // Admin Step 4: Complete inspection
        $completeRes = $this->actingAs($admin)
            ->postJson("/api/admin/requests/{$request->id}/complete-inspection", [
                'inspection_findings' => 'All structural elements, electrical fittings, and documents verified with zero defects.',
            ]);
        $completeRes->assertStatus(200)
            ->assertJsonPath('request.status', PropertyRequestStatus::INSPECTION_COMPLETED->value);

        // Admin Step 5: Confirm Sale
        $saleRes = $this->actingAs($admin)
            ->postJson("/api/admin/requests/{$request->id}/confirm-sale");

        $saleRes->assertStatus(200)
            ->assertJsonPath('request.status', PropertyRequestStatus::SALE_CONFIRMED->value);

        // Assert Property is marked SOLD
        $this->assertEquals('sold', $property->fresh()->transaction_status);

        // Assert PropertySale record is created
        $this->assertDatabaseHas('property_sales', [
            'property_id' => $property->id,
            'buyer_id'    => $buyer->id,
            'seller_id'   => $seller->id,
            'final_price' => 14800000,
        ]);
    }

    /**
     * Test 8: Admin cancel deal rolls property back to AVAILABLE.
     */
    public function test_admin_cancel_rolls_property_back_to_available()
    {
        $buyer = $this->createBuyer();
        $seller = $this->createSeller();
        $admin = $this->createAdmin();
        $property = $this->createApprovedProperty($seller);
        $property->update(['transaction_status' => 'meeting_scheduled']);

        $request = PropertyRequest::create([
            'property_id'    => $property->id,
            'buyer_id'       => $buyer->id,
            'seller_id'      => $seller->id,
            'offered_amount' => 14800000,
            'preferred_date' => now()->addDays(2),
            'status'         => PropertyRequestStatus::SCHEDULE_FIXED,
        ]);

        $cancelRes = $this->actingAs($admin)
            ->postJson("/api/admin/requests/{$request->id}/cancel", [
                'cancellation_reason' => 'Buyer was unable to secure bank financing approval.',
            ]);

        $cancelRes->assertStatus(200)
            ->assertJsonPath('request.status', PropertyRequestStatus::CANCELLED->value);

        // Property rolled back to available
        $this->assertEquals('available', $property->fresh()->transaction_status);
    }
}
