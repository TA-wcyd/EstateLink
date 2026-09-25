<?php

namespace App\Http\Controllers;

use App\Models\Auction;
use App\Models\Bid;
use App\Models\BiddingRequest;
use App\Models\Property;
use App\Models\PropertySale;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AuctionController extends Controller
{
    /**
     * Seller submits a request to host an auction for an approved property.
     *
     * POST /api/my-properties/{id}/bidding-request
     */
    public function requestBidding(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $property = Property::query()
            ->where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (!$property) {
            return response()->json(['message' => 'Property not found or unauthorized.'], 404);
        }

        if ($property->verification_status !== 'approved') {
            return response()->json([
                'message' => 'Only admin-verified & approved properties are eligible for live auction requests.',
            ], 422);
        }

        if ($property->transaction_status === 'sold') {
            return response()->json([
                'message' => 'This property has already been marked as sold.',
            ], 422);
        }

        // Check for active auction
        $hasActiveAuction = Auction::query()
            ->where('property_id', $property->id)
            ->whereIn('status', ['active', 'awaiting_seller_confirmation'])
            ->exists();

        if ($hasActiveAuction) {
            return response()->json([
                'message' => 'An active or pending auction is already underway for this property.',
            ], 422);
        }

        // Check for existing pending request
        $hasPendingRequest = BiddingRequest::query()
            ->where('property_id', $property->id)
            ->where('status', 'pending')
            ->exists();

        if ($hasPendingRequest) {
            return response()->json([
                'message' => 'A pending bidding request is already awaiting admin review for this property.',
            ], 422);
        }

        $validated = $request->validate([
            'start_price'    => ['required', 'numeric', 'min:0.01'],
            'min_increment'  => ['required', 'numeric', 'min:0.01'],
            'duration_hours' => ['required', 'integer', 'min:1', 'max:720'], // up to 30 days
        ]);

        $biddingRequest = BiddingRequest::create([
            'property_id'    => $property->id,
            'user_id'        => $user->id,
            'start_price'    => $validated['start_price'],
            'min_increment'  => $validated['min_increment'],
            'duration_hours' => $validated['duration_hours'],
            'status'         => 'pending',
            'requested_at'   => now(),
        ]);

        return response()->json([
            'message'         => 'Bidding request submitted successfully. EstateLink administrators will review your request.',
            'bidding_request' => $biddingRequest,
        ], 201);
    }

    /**
     * Seller lists bidding requests for a specific property.
     *
     * GET /api/my-properties/{id}/bidding-requests
     */
    public function getPropertyBiddingRequests(Request $request, int $id): JsonResponse
    {
        $property = Property::query()
            ->where('id', $id)
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$property) {
            return response()->json(['message' => 'Property not found.'], 404);
        }

        $requests = BiddingRequest::query()
            ->where('property_id', $property->id)
            ->with(['auction', 'reviewer:id,name,email'])
            ->latest()
            ->get();

        return response()->json(['bidding_requests' => $requests]);
    }

    /**
     * Public/Live polling endpoint for property auction and bid stream.
     * Includes masked bidder anonymity rules based on viewer role/identity.
     *
     * GET /api/properties/{id}/auction
     */
    public function showAuction(Request $request, int $id): JsonResponse
    {
        $property = Property::query()->find($id);

        if (!$property) {
            return response()->json(['message' => 'Property not found.'], 404);
        }

        $pendingRequest = BiddingRequest::where('property_id', $property->id)->where('status', 'pending')->first();

        // Find latest active or recent auction for this property
        $auction = Auction::query()
            ->where('property_id', $property->id)
            ->with(['winningBid'])
            ->latest('id')
            ->first();

        if (!$auction) {
            return response()->json([
                'has_auction'         => false,
                'property_id'         => $property->id,
                'property'            => [
                    'id'                  => $property->id,
                    'user_id'             => $property->user_id,
                    'title'               => $property->title,
                    'price'               => (float)$property->price,
                    'verification_status' => $property->verification_status,
                    'transaction_status'  => $property->transaction_status,
                ],
                'has_pending_request' => (bool)$pendingRequest,
                'message'             => 'No auction found for this property.',
            ]);
        }

        // Auto-check expiry transition on read if time passed while still active
        if ($auction->status === 'active' && now()->gte($auction->end_time)) {
            $highestBid = Bid::where('auction_id', $auction->id)->orderBy('amount', 'desc')->first();
            if ($highestBid) {
                $auction->update([
                    'status'         => 'awaiting_seller_confirmation',
                    'winning_bid_id' => $highestBid->id,
                ]);
            } else {
                $auction->update([
                    'status'         => 'expired',
                    'winning_bid_id' => null,
                ]);
            }
            $auction->refresh();
        }

        $viewer = $request->user('sanctum') ?? auth('sanctum')->user() ?? $request->user();
        $isSeller = $viewer && ($viewer->id === $auction->seller_id);
        $isAdmin  = $viewer && ($viewer->role === 'admin');

        // Fetch all bids ordered highest to lowest
        $rawBids = Bid::query()
            ->where('auction_id', $auction->id)
            ->with(['user:id,name,email,phone'])
            ->orderBy('amount', 'desc')
            ->orderBy('placed_at', 'asc')
            ->get();

        $topBid = $rawBids->first();
        $topBidAmount = $topBid ? (float)$topBid->amount : null;

        $nextMinBid = $topBid
            ? (float)($topBid->amount + $auction->min_increment)
            : (float)$auction->start_price;

        // Transform bids with strict server-side anonymity rules
        $formattedBids = $rawBids->map(function (Bid $bid) use ($viewer, $isSeller, $isAdmin) {
            $isYou = $viewer && ($viewer->id === $bid->user_id);

            $item = [
                'id'              => $bid->id,
                'amount'          => (float)$bid->amount,
                'bidder_number'   => $bid->bidder_number,
                'placed_at'       => $bid->placed_at ? $bid->placed_at->toIso8601String() : null,
                'is_direct_offer' => (bool)$bid->is_direct_offer,
                'is_you'          => $isYou,
            ];

            if ($isAdmin || $isSeller) {
                // Admin and Seller see full real identities
                $item['bidder_label'] = ($isYou ? "You (" . $bid->user->name . ")" : $bid->user->name) . " [Bidder #" . $bid->bidder_number . "]";
                $item['bidder_name']  = $bid->user->name;
                $item['bidder_email'] = $bid->user->email;
                $item['bidder_phone'] = $bid->user->phone ?? 'N/A';
            } elseif ($isYou) {
                // The viewer is the bidder
                $item['bidder_label'] = "You (Bidder #" . $bid->bidder_number . ")";
            } else {
                // Public / other buyer view: completely masked
                $item['bidder_label'] = "Bidder #" . $bid->bidder_number;
            }

            return $item;
        });

        $userHighestBid = ($viewer && !$isSeller)
            ? $rawBids->where('user_id', $viewer->id)->first()
            : null;

        $isHighestBidder = $viewer && $topBid && ($topBid->user_id === $viewer->id);

        return response()->json([
            'has_auction'         => true,
            'has_pending_request' => (bool)$pendingRequest,
            'property'            => [
                'id'                  => $property->id,
                'user_id'             => $property->user_id,
                'title'               => $property->title,
                'price'               => (float)$property->price,
                'verification_status' => $property->verification_status,
                'transaction_status'  => $property->transaction_status,
            ],
            'auction' => [
                'id'                => $auction->id,
                'property_id'       => $auction->property_id,
                'seller_id'         => $auction->seller_id,
                'start_price'       => (float)$auction->start_price,
                'min_increment'     => (float)$auction->min_increment,
                'start_time'        => $auction->start_time ? $auction->start_time->toIso8601String() : null,
                'end_time'          => $auction->end_time ? $auction->end_time->toIso8601String() : null,
                'remaining_seconds' => $auction->remaining_seconds,
                'status'            => $auction->status,
                'is_ended'          => $auction->hasEnded(),
                'is_active'         => $auction->isActive(),
                'top_bid_amount'    => $topBidAmount,
                'next_min_bid'      => $nextMinBid,
                'total_bids'        => $rawBids->count(),
                'winning_bid_id'    => $auction->winning_bid_id,
                'seller_notes'      => $auction->seller_notes,
            ],
            'bids' => $formattedBids,
            'viewer' => [
                'is_authenticated'  => (bool)$viewer,
                'is_seller'         => $isSeller,
                'is_admin'          => $isAdmin,
                'is_highest_bidder' => $isHighestBidder,
                'user_top_bid'      => $userHighestBid ? (float)$userHighestBid->amount : null,
            ],
        ]);
    }

    /**
     * Place a live bid on an active auction.
     * Enforces strict server-side validation & concurrency control via pessimistic DB lock.
     *
     * POST /api/auctions/{id}/bids
     */
    public function placeBid(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
        ]);

        $submittedAmount = (float)$validated['amount'];

        try {
            // Execute placement under DB transaction with pessimistic locking
            $result = DB::transaction(function () use ($id, $user, $submittedAmount) {
                // Pessimistic write lock on the auction record
                $auction = Auction::where('id', $id)->lockForUpdate()->first();

                if (!$auction) {
                    return response()->json(['message' => 'Auction not found.'], 404);
                }

                // Rule 1: Seller cannot bid on their own auction
                if ($auction->seller_id === $user->id) {
                    return response()->json([
                        'message' => 'Sellers cannot place bids on their own properties.',
                        'errors'  => ['bid' => ['Sellers cannot place bids on their own properties.']],
                    ], 422);
                }

                // Rule 2: Auction must be active and current time < end time
                if ($auction->status !== 'active' || now()->gte($auction->end_time)) {
                    return response()->json([
                        'message' => 'This auction is no longer active or the bidding window has closed.',
                        'errors'  => ['bid' => ['This auction is no longer active or the bidding window has closed.']],
                    ], 422);
                }

                // Rule 3: Server-side minimum increment calculation under lock
                $currentTopBid = Bid::where('auction_id', $auction->id)
                    ->orderBy('amount', 'desc')
                    ->lockForUpdate()
                    ->first();

                $minRequired = $currentTopBid
                    ? ((float)$currentTopBid->amount + (float)$auction->min_increment)
                    : (float)$auction->start_price;

                if ($submittedAmount < $minRequired) {
                    return response()->json([
                        'message' => "Bid amount must be at least ৳" . number_format($minRequired, 2) . " (current top: ৳" . number_format($currentTopBid ? $currentTopBid->amount : $auction->start_price, 2) . " + minimum increment: ৳" . number_format($auction->min_increment, 2) . ").",
                        'errors'  => [
                            'amount' => [
                                "Bid amount must be at least ৳" . number_format($minRequired, 2)
                            ]
                        ],
                    ], 422);
                }

                // Rule 4: Consistent sequential anonymous bidder identifier per user in this auction
                $existingUserBid = Bid::where('auction_id', $auction->id)
                    ->where('user_id', $user->id)
                    ->first();

                if ($existingUserBid) {
                    $bidderNumber = $existingUserBid->bidder_number;
                } else {
                    $maxBidderNumber = Bid::where('auction_id', $auction->id)->max('bidder_number') ?? 0;
                    $bidderNumber = $maxBidderNumber + 1;
                }

                // Immutable bid record creation
                $bid = Bid::create([
                    'auction_id'      => $auction->id,
                    'user_id'         => $user->id,
                    'amount'          => $submittedAmount,
                    'bidder_number'   => $bidderNumber,
                    'is_direct_offer' => false,
                    'placed_at'       => now(),
                ]);

                return [
                    'bid'         => $bid,
                    'next_min'    => $submittedAmount + (float)$auction->min_increment,
                    'total_bids'  => Bid::where('auction_id', $auction->id)->count(),
                ];
            });

            if ($result instanceof JsonResponse) {
                return $result;
            }

            return response()->json([
                'message'  => "Bid of ৳" . number_format($result['bid']->amount, 2) . " placed successfully!",
                'bid'      => $result['bid'],
                'next_min' => $result['next_min'],
            ], 201);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Seller accepts the winning bid for an auction awaiting confirmation.
     *
     * POST /api/auctions/{id}/accept
     */
    public function acceptWinningBid(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $sale = DB::transaction(function () use ($id, $user, $request) {
            $auction = Auction::where('id', $id)->lockForUpdate()->first();

            if (!$auction) {
                return response()->json(['message' => 'Auction not found.'], 404);
            }

            if ($auction->seller_id !== $user->id) {
                return response()->json(['message' => 'Unauthorized. Only the seller can accept the winning bid.'], 403);
            }

            if ($auction->status !== 'awaiting_seller_confirmation') {
                return response()->json(['message' => "Auction is in '{$auction->status}' status and cannot be accepted."], 422);
            }

            $winningBid = $auction->winning_bid_id
                ? Bid::find($auction->winning_bid_id)
                : Bid::where('auction_id', $auction->id)->orderBy('amount', 'desc')->first();

            if (!$winningBid) {
                return response()->json(['message' => 'No valid winning bid found to accept.'], 422);
            }

            // Update Auction status to 'sold'
            $auction->update([
                'status'         => 'sold',
                'winning_bid_id' => $winningBid->id,
                'seller_notes'   => $request->input('notes', 'Accepted by seller.'),
            ]);

            // Update Property status to 'sold'
            $property = Property::find($auction->property_id);
            if ($property) {
                $property->update([
                    'transaction_status' => 'sold',
                ]);
            }

            // Create PropertySale transaction record
            return PropertySale::create([
                'property_id' => $auction->property_id,
                'auction_id'  => $auction->id,
                'seller_id'   => $auction->seller_id,
                'buyer_id'    => $winningBid->user_id,
                'final_price' => $winningBid->amount,
                'sold_at'     => now(),
                'notes'       => 'Auction successfully concluded and confirmed by seller.',
            ]);
        });

        if ($sale instanceof JsonResponse) {
            return $sale;
        }

        return response()->json([
            'message' => 'Winning bid accepted! The property is now marked as SOLD and the transaction recorded.',
            'sale'    => $sale->load(['buyer:id,name,email,phone', 'property:id,title,location']),
        ]);
    }

    /**
     * Seller declines the winning bid for an auction awaiting confirmation.
     *
     * POST /api/auctions/{id}/decline
     */
    public function declineWinningBid(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'seller_notes' => ['required', 'string', 'min:5', 'max:1000'],
        ]);

        $auction = DB::transaction(function () use ($id, $user, $validated) {
            $auction = Auction::where('id', $id)->lockForUpdate()->first();

            if (!$auction) {
                return response()->json(['message' => 'Auction not found.'], 404);
            }

            if ($auction->seller_id !== $user->id) {
                return response()->json(['message' => 'Unauthorized. Only the seller can decline the winning bid.'], 403);
            }

            if ($auction->status !== 'awaiting_seller_confirmation') {
                return response()->json(['message' => "Auction is in '{$auction->status}' status and cannot be declined."], 422);
            }

            // Mark auction cancelled with seller explanation
            $auction->update([
                'status'       => 'cancelled',
                'seller_notes' => $validated['seller_notes'],
            ]);

            // Ensure property returns to normal available listing state
            $property = Property::find($auction->property_id);
            if ($property && $property->transaction_status !== 'sold') {
                $property->update([
                    'transaction_status' => 'available',
                ]);
            }

            return $auction;
        });

        if ($auction instanceof JsonResponse) {
            return $auction;
        }

        return response()->json([
            'message' => 'Winning bid declined. The auction has been cancelled and the property returned to normal listing.',
            'auction' => $auction,
        ]);
    }

    /**
     * Buyer view of their placed bids with status badges (Winning / Outbid / Won / Lost).
     *
     * GET /api/my-bids
     */
    public function myBids(Request $request): JsonResponse
    {
        $user = $request->user();

        // Get all unique auctions where the user has placed bids
        $auctionIds = Bid::query()
            ->where('user_id', $user->id)
            ->distinct()
            ->pluck('auction_id');

        $auctions = Auction::query()
            ->whereIn('id', $auctionIds)
            ->with([
                'property:id,title,location,price,property_type',
                'property.primaryImage',
                'winningBid',
                'seller:id,name,email,phone',
            ])
            ->latest('created_at')
            ->get();

        $history = $auctions->map(function (Auction $auction) use ($user) {
            $userBids = Bid::query()
                ->where('auction_id', $auction->id)
                ->where('user_id', $user->id)
                ->orderBy('amount', 'desc')
                ->get();

            $userHighestBid = $userBids->first();

            $auctionHighestBid = Bid::query()
                ->where('auction_id', $auction->id)
                ->orderBy('amount', 'desc')
                ->first();

            $currentTopAmount = $auctionHighestBid ? (float)$auctionHighestBid->amount : (float)$auction->start_price;
            $userTopAmount    = $userHighestBid ? (float)$userHighestBid->amount : 0.0;

            // Compute status badge
            $badgeStatus = 'lost';
            $badgeLabel  = 'Lost';

            if ($auction->status === 'active') {
                if ($userHighestBid && $auctionHighestBid && $userHighestBid->id === $auctionHighestBid->id) {
                    $badgeStatus = 'winning';
                    $badgeLabel  = 'Winning (Top Bidder)';
                } else {
                    $badgeStatus = 'outbid';
                    $badgeLabel  = 'Outbid';
                }
            } elseif ($auction->status === 'awaiting_seller_confirmation') {
                if ($userHighestBid && $auctionHighestBid && $userHighestBid->id === $auctionHighestBid->id) {
                    $badgeStatus = 'pending_confirmation';
                    $badgeLabel  = 'Top Bidder (Awaiting Seller Decision)';
                } else {
                    $badgeStatus = 'outbid';
                    $badgeLabel  = 'Outbid';
                }
            } elseif ($auction->status === 'sold') {
                if ($auction->winning_bid_id && $userHighestBid && $auction->winning_bid_id === $userHighestBid->id) {
                    $badgeStatus = 'won';
                    $badgeLabel  = 'Won Property 🎉';
                } else {
                    $badgeStatus = 'lost';
                    $badgeLabel  = 'Lost (Sold to another bidder)';
                }
            } elseif ($auction->status === 'cancelled') {
                $badgeStatus = 'cancelled';
                $badgeLabel  = 'Cancelled by Seller';
            } elseif ($auction->status === 'expired') {
                $badgeStatus = 'expired';
                $badgeLabel  = 'Expired';
            }

            return [
                'auction_id'          => $auction->id,
                'property'            => $auction->property,
                'seller'              => $auction->seller ? ['name' => $auction->seller->name, 'email' => $auction->seller->email] : null,
                'auction_status'      => $auction->status,
                'end_time'            => $auction->end_time ? $auction->end_time->toIso8601String() : null,
                'badge_status'        => $badgeStatus,
                'badge_label'         => $badgeLabel,
                'current_top_amount'  => $currentTopAmount,
                'user_highest_bid'    => $userTopAmount,
                'user_bids_count'     => $userBids->count(),
                'user_bids'           => $userBids->map(function (Bid $b) {
                    return [
                        'id'        => $b->id,
                        'amount'    => (float)$b->amount,
                        'placed_at' => $b->placed_at ? $b->placed_at->toIso8601String() : null,
                    ];
                }),
            ];
        });

        return response()->json([
            'bids_history' => $history,
            'total_participated_auctions' => $history->count(),
        ]);
    }
}
