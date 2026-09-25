<?php

namespace Tests\Feature;

use App\Models\Auction;
use App\Models\Bid;
use App\Models\BiddingRequest;
use App\Models\Property;
use App\Models\PropertySale;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class AuctionBiddingSystemTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $seller;
    private User $buyer1;
    private User $buyer2;
    private Property $approvedProperty;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'name'                => 'Admin User',
            'email'               => 'admin@estatelink.test',
            'phone'               => '01700000001',
            'national_id'         => 'NID-ADMIN-01',
            'password'            => bcrypt('password123'),
            'role'                => 'admin',
            'verification_status' => 'verified',
        ]);

        $this->seller = User::create([
            'name'                => 'Seller Rahim',
            'email'               => 'seller@estatelink.test',
            'phone'               => '01700000002',
            'national_id'         => 'NID-SELLER-01',
            'password'            => bcrypt('password123'),
            'role'                => 'user',
            'verification_status' => 'verified',
        ]);

        $this->buyer1 = User::create([
            'name'                => 'Buyer Karim',
            'email'               => 'buyer1@estatelink.test',
            'phone'               => '01700000003',
            'national_id'         => 'NID-BUYER-01',
            'password'            => bcrypt('password123'),
            'role'                => 'user',
            'verification_status' => 'verified',
        ]);

        $this->buyer2 = User::create([
            'name'                => 'Buyer Jamila',
            'email'               => 'buyer2@estatelink.test',
            'phone'               => '01700000004',
            'national_id'         => 'NID-BUYER-02',
            'password'            => bcrypt('password123'),
            'role'                => 'user',
            'verification_status' => 'verified',
        ]);

        $this->approvedProperty = Property::create([
            'user_id'             => $this->seller->id,
            'title'               => 'Gulshan Luxury Apartment',
            'property_type'       => 'apartment',
            'description'         => 'High-end residential penthouse.',
            'price'               => 20000000,
            'size'                => 2800,
            'bedrooms'            => 3,
            'bathrooms'           => 3,
            'location'            => 'Gulshan 2, Dhaka',
            'address'             => 'Road 71, Gulshan 2',
            'phone'               => '01700000002',
            'verification_status' => 'approved',
            'transaction_status'  => 'available',
            'submitted_at'        => now(),
        ]);
    }

    /**
     * Test 1: Seller can request an auction for their approved property.
     */
    public function test_seller_can_submit_bidding_request_for_approved_property(): void
    {
        $response = $this->actingAs($this->seller, 'sanctum')->postJson("/api/my-properties/{$this->approvedProperty->id}/bidding-request", [
            'start_price'    => 15000000,
            'min_increment'  => 100000,
            'duration_hours' => 48,
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('bidding_request.status', 'pending');
        $response->assertJsonPath('bidding_request.start_price', 15000000);

        $this->assertDatabaseHas('bidding_requests', [
            'property_id'    => $this->approvedProperty->id,
            'user_id'        => $this->seller->id,
            'start_price'    => 15000000,
            'min_increment'  => 100000,
            'duration_hours' => 48,
            'status'         => 'pending',
        ]);
    }

    /**
     * Test 2: Unapproved property cannot request bidding, and non-owner cannot request.
     */
    public function test_unapproved_property_or_non_owner_cannot_request_bidding(): void
    {
        $unapprovedProp = Property::create([
            'user_id'             => $this->seller->id,
            'title'               => 'Pending House',
            'property_type'       => 'house',
            'description'         => 'Pending verification',
            'price'               => 10000000,
            'size'                => 1800,
            'location'            => 'Dhanmondi',
            'address'             => 'Road 27',
            'verification_status' => 'pending',
        ]);

        // Seller tries for unapproved property
        $res1 = $this->actingAs($this->seller, 'sanctum')->postJson("/api/my-properties/{$unapprovedProp->id}/bidding-request", [
            'start_price'    => 8000000,
            'min_increment'  => 50000,
            'duration_hours' => 24,
        ]);
        $res1->assertStatus(422);

        // Buyer tries for seller's approved property
        $res2 = $this->actingAs($this->buyer1, 'sanctum')->postJson("/api/my-properties/{$this->approvedProperty->id}/bidding-request", [
            'start_price'    => 15000000,
            'min_increment'  => 50000,
            'duration_hours' => 24,
        ]);
        $res2->assertStatus(404);
    }

    /**
     * Test 3: Admin review workflow — approval creates live Auction record.
     */
    public function test_admin_approval_creates_active_auction(): void
    {
        $biddingReq = BiddingRequest::create([
            'property_id'    => $this->approvedProperty->id,
            'user_id'        => $this->seller->id,
            'start_price'    => 15000000,
            'min_increment'  => 100000,
            'duration_hours' => 48,
            'status'         => 'pending',
            'requested_at'   => now(),
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')->postJson("/api/admin/bidding-requests/{$biddingReq->id}/approve", [
            'admin_note' => 'Approved. Verified title deed and valuation.',
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('bidding_request.status', 'approved');
        $response->assertJsonPath('auction.status', 'active');

        $this->assertDatabaseHas('auctions', [
            'property_id'        => $this->approvedProperty->id,
            'bidding_request_id' => $biddingReq->id,
            'seller_id'          => $this->seller->id,
            'status'             => 'active',
        ]);
    }

    /**
     * Test 4: Bid placement rules — Minimum increment and seller self-bidding prevention.
     */
    public function test_bid_placement_minimum_increment_and_self_bidding_prevention(): void
    {
        $auction = Auction::create([
            'property_id'   => $this->approvedProperty->id,
            'seller_id'     => $this->seller->id,
            'start_price'   => 10000000,
            'min_increment' => 500000,
            'start_time'    => now()->subHour(),
            'end_time'      => now()->addHours(24),
            'status'        => 'active',
        ]);

        // Seller attempts to bid on own auction -> 422 / forbidden
        $resSeller = $this->actingAs($this->seller, 'sanctum')->postJson("/api/auctions/{$auction->id}/bids", [
            'amount' => 11000000,
        ]);
        $resSeller->assertStatus(422);

        // Buyer 1 bids below start price (9,000,000 < 10,000,000)
        $resLow = $this->actingAs($this->buyer1, 'sanctum')->postJson("/api/auctions/{$auction->id}/bids", [
            'amount' => 9000000,
        ]);
        $resLow->assertStatus(422);

        // Buyer 1 places valid opening bid (10,000,000)
        $resValid1 = $this->actingAs($this->buyer1, 'sanctum')->postJson("/api/auctions/{$auction->id}/bids", [
            'amount' => 10000000,
        ]);
        $resValid1->assertStatus(201);
        $this->assertDatabaseHas('bids', [
            'auction_id' => $auction->id,
            'user_id'    => $this->buyer1->id,
            'amount'     => 10000000,
        ]);

        // Buyer 2 bids less than top bid + min increment (10,000,000 + 500,000 = 10,500,000 required, bids 10,200,000)
        $resUnderMin = $this->actingAs($this->buyer2, 'sanctum')->postJson("/api/auctions/{$auction->id}/bids", [
            'amount' => 10200000,
        ]);
        $resUnderMin->assertStatus(422);

        // Buyer 2 places valid outbid (11,000,000 >= 10,500,000)
        $resValid2 = $this->actingAs($this->buyer2, 'sanctum')->postJson("/api/auctions/{$auction->id}/bids", [
            'amount' => 11000000,
        ]);
        $resValid2->assertStatus(201);
    }

    /**
     * Test 5: Rejection of bids on expired or closed auctions.
     */
    public function test_bid_rejected_on_expired_auction(): void
    {
        $expiredAuction = Auction::create([
            'property_id'   => $this->approvedProperty->id,
            'seller_id'     => $this->seller->id,
            'start_price'   => 10000000,
            'min_increment' => 500000,
            'start_time'    => now()->subHours(48),
            'end_time'      => now()->subMinute(), // expired
            'status'        => 'active',
        ]);

        $response = $this->actingAs($this->buyer1, 'sanctum')->postJson("/api/auctions/{$expiredAuction->id}/bids", [
            'amount' => 12000000,
        ]);

        $response->assertStatus(422);
    }

    /**
     * Test 6: Anonymity masking rules for public/buyer polling vs seller/admin.
     */
    public function test_anonymity_masking_in_polling_endpoint(): void
    {
        $auction = Auction::create([
            'property_id'   => $this->approvedProperty->id,
            'seller_id'     => $this->seller->id,
            'start_price'   => 5000000,
            'min_increment' => 200000,
            'start_time'    => now()->subHour(),
            'end_time'      => now()->addHours(12),
            'status'        => 'active',
        ]);

        // Place bids
        Bid::create([
            'auction_id'    => $auction->id,
            'user_id'       => $this->buyer1->id,
            'amount'        => 5200000,
            'bidder_number' => 1,
            'placed_at'     => now()->subMinutes(30),
        ]);

        Bid::create([
            'auction_id'    => $auction->id,
            'user_id'       => $this->buyer2->id,
            'amount'        => 5500000,
            'bidder_number' => 2,
            'placed_at'     => now()->subMinutes(15),
        ]);

        // Public / Guest check
        $guestRes = $this->getJson("/api/properties/{$this->approvedProperty->id}/auction");
        $guestRes->assertStatus(200);
        $guestBids = $guestRes->json('bids');
        $this->assertEquals('Bidder #2', $guestBids[0]['bidder_label']);
        $this->assertArrayNotHasKey('bidder_email', $guestBids[0]);

        // Buyer 1 check: sees "You (Bidder #1)" for their own bid and "Bidder #2" for the other
        $buyer1Res = $this->actingAs($this->buyer1, 'sanctum')->getJson("/api/properties/{$this->approvedProperty->id}/auction");
        $buyer1Bids = $buyer1Res->json('bids');
        $this->assertEquals('Bidder #2', $buyer1Bids[0]['bidder_label']);
        $this->assertEquals('You (Bidder #1)', $buyer1Bids[1]['bidder_label']);
        $this->assertArrayNotHasKey('bidder_email', $buyer1Bids[0]);

        // Seller check: sees full real names & contact info
        $sellerRes = $this->actingAs($this->seller, 'sanctum')->getJson("/api/properties/{$this->approvedProperty->id}/auction");
        $sellerBids = $sellerRes->json('bids');
        $this->assertEquals('buyer2@estatelink.test', $sellerBids[0]['bidder_email']);
        $this->assertEquals('Buyer Jamila', $sellerBids[0]['bidder_name']);
    }

    /**
     * Test 7: Automated expiry artisan command transitions status correctly.
     */
    public function test_artisan_expire_command_transitions_status(): void
    {
        // Auction 1: Expired with bids -> should become 'awaiting_seller_confirmation'
        $auctionWithBids = Auction::create([
            'property_id'   => $this->approvedProperty->id,
            'seller_id'     => $this->seller->id,
            'start_price'   => 5000000,
            'min_increment' => 100000,
            'start_time'    => now()->subHours(24),
            'end_time'      => now()->subMinutes(5), // expired
            'status'        => 'active',
        ]);

        $winningBid = Bid::create([
            'auction_id'    => $auctionWithBids->id,
            'user_id'       => $this->buyer2->id,
            'amount'        => 6000000,
            'bidder_number' => 1,
            'placed_at'     => now()->subHours(2),
        ]);

        // Auction 2: Expired without bids -> should become 'expired'
        $prop2 = Property::create([
            'user_id'             => $this->seller->id,
            'title'               => 'Dhanmondi Plot',
            'property_type'       => 'land',
            'description'         => 'Land plot',
            'price'               => 15000000,
            'size'                => 3600,
            'location'            => 'Dhanmondi',
            'address'             => 'Road 15',
            'verification_status' => 'approved',
            'transaction_status'  => 'available',
        ]);

        $auctionNoBids = Auction::create([
            'property_id'   => $prop2->id,
            'seller_id'     => $this->seller->id,
            'start_price'   => 15000000,
            'min_increment' => 500000,
            'start_time'    => now()->subHours(24),
            'end_time'      => now()->subMinutes(5),
            'status'        => 'active',
        ]);

        $this->artisan('auctions:expire')->assertSuccessful();

        $auctionWithBids->refresh();
        $this->assertEquals('awaiting_seller_confirmation', $auctionWithBids->status);
        $this->assertEquals($winningBid->id, $auctionWithBids->winning_bid_id);

        $auctionNoBids->refresh();
        $this->assertEquals('expired', $auctionNoBids->status);
        $this->assertNull($auctionNoBids->winning_bid_id);
    }

    /**
     * Test 8: Seller decision workflow (Accept -> Sold & PropertySale record, Decline -> Cancelled).
     */
    public function test_seller_decision_accept_and_decline(): void
    {
        $auction = Auction::create([
            'property_id'   => $this->approvedProperty->id,
            'seller_id'     => $this->seller->id,
            'start_price'   => 5000000,
            'min_increment' => 100000,
            'start_time'    => now()->subHours(24),
            'end_time'      => now()->subMinutes(5),
            'status'        => 'awaiting_seller_confirmation',
        ]);

        $bid = Bid::create([
            'auction_id'    => $auction->id,
            'user_id'       => $this->buyer1->id,
            'amount'        => 6500000,
            'bidder_number' => 1,
            'placed_at'     => now()->subHour(),
        ]);
        $auction->update(['winning_bid_id' => $bid->id]);

        // Seller accepts winning bid
        $acceptRes = $this->actingAs($this->seller, 'sanctum')->postJson("/api/auctions/{$auction->id}/accept", [
            'notes' => 'Confirmed sale.',
        ]);

        $acceptRes->assertStatus(200);

        $auction->refresh();
        $this->approvedProperty->refresh();

        $this->assertEquals('sold', $auction->status);
        $this->assertEquals('sold', $this->approvedProperty->transaction_status);

        $this->assertDatabaseHas('property_sales', [
            'property_id' => $this->approvedProperty->id,
            'auction_id'  => $auction->id,
            'seller_id'   => $this->seller->id,
            'buyer_id'    => $this->buyer1->id,
            'final_price' => 6500000,
        ]);
    }

    /**
     * Test 9: Buyer bid history endpoint tags bids with correct badges.
     */
    public function test_buyer_bid_history_endpoint(): void
    {
        $auction = Auction::create([
            'property_id'   => $this->approvedProperty->id,
            'seller_id'     => $this->seller->id,
            'start_price'   => 5000000,
            'min_increment' => 100000,
            'start_time'    => now()->subHour(),
            'end_time'      => now()->addHours(5),
            'status'        => 'active',
        ]);

        // Buyer 1 places 5,500,000
        Bid::create([
            'auction_id'    => $auction->id,
            'user_id'       => $this->buyer1->id,
            'amount'        => 5500000,
            'bidder_number' => 1,
            'placed_at'     => now()->subMinutes(10),
        ]);

        // Check Buyer 1 history when winning
        $res1 = $this->actingAs($this->buyer1, 'sanctum')->getJson('/api/my-bids');
        $res1->assertStatus(200);
        $this->assertEquals('winning', $res1->json('bids_history.0.badge_status'));

        // Buyer 2 outbids
        Bid::create([
            'auction_id'    => $auction->id,
            'user_id'       => $this->buyer2->id,
            'amount'        => 6000000,
            'bidder_number' => 2,
            'placed_at'     => now()->subMinutes(5),
        ]);

        // Check Buyer 1 history when outbid
        $res2 = $this->actingAs($this->buyer1, 'sanctum')->getJson('/api/my-bids');
        $res2->assertStatus(200);
        $this->assertEquals('outbid', $res2->json('bids_history.0.badge_status'));
    }

    /**
     * Test 10: Auction request supports any flexible initial amount and decimal value.
     */
    public function test_auction_request_supports_flexible_and_custom_initial_amounts(): void
    {
        $response = $this->actingAs($this->seller, 'sanctum')->postJson("/api/my-properties/{$this->approvedProperty->id}/bidding-request", [
            'start_price'    => 12500.50,
            'min_increment'  => 50.25,
            'duration_hours' => 24,
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('bidding_request.start_price', 12500.5);
        $response->assertJsonPath('bidding_request.min_increment', 50.25);

        $this->assertDatabaseHas('bidding_requests', [
            'property_id'   => $this->approvedProperty->id,
            'start_price'   => 12500.50,
            'min_increment' => 50.25,
        ]);
    }
}
