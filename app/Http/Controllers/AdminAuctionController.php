<?php

namespace App\Http\Controllers;

use App\Models\Auction;
use App\Models\BiddingRequest;
use App\Models\Property;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminAuctionController extends Controller
{
    /**
     * List bidding requests for Admin review.
     *
     * GET /api/admin/bidding-requests
     */
    public function index(Request $request): JsonResponse
    {
        $query = BiddingRequest::query()
            ->with([
                'property:id,user_id,title,property_type,price,location,verification_status',
                'property.primaryImage',
                'user:id,name,email,phone,national_id,verification_status',
                'reviewer:id,name,email',
                'auction',
            ])
            ->latest('requested_at');

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        $requests = $query->paginate((int)$request->query('per_page', 15));

        return response()->json($requests);
    }

    /**
     * Admin approves a seller's bidding request, instantly spawning the live Auction event.
     *
     * POST /api/admin/bidding-requests/{id}/approve
     */
    public function approve(Request $request, int $id): JsonResponse
    {
        $admin = $request->user();

        $biddingRequest = BiddingRequest::with('property')->find($id);

        if (!$biddingRequest) {
            return response()->json(['message' => 'Bidding request not found.'], 404);
        }

        if ($biddingRequest->status !== 'pending') {
            return response()->json([
                'message' => "This request has already been {$biddingRequest->status}.",
            ], 422);
        }

        // Verify property is still approved and not sold
        if ($biddingRequest->property->verification_status !== 'approved' || $biddingRequest->property->transaction_status === 'sold') {
            return response()->json([
                'message' => 'Underlying property is not eligible for auction (unapproved or sold).',
            ], 422);
        }

        // Check if active auction is already running on this property
        $hasActiveAuction = Auction::query()
            ->where('property_id', $biddingRequest->property_id)
            ->whereIn('status', ['active', 'awaiting_seller_confirmation'])
            ->exists();

        if ($hasActiveAuction) {
            return response()->json([
                'message' => 'An active auction is already in progress for this property.',
            ], 422);
        }

        $auction = DB::transaction(function () use ($biddingRequest, $admin, $request) {
            $startTime = now();
            $endTime   = now()->addHours((int)$biddingRequest->duration_hours);

            // 1. Create live auction event
            $auction = Auction::create([
                'property_id'        => $biddingRequest->property_id,
                'bidding_request_id' => $biddingRequest->id,
                'seller_id'          => $biddingRequest->user_id,
                'start_price'        => $biddingRequest->start_price,
                'min_increment'      => $biddingRequest->min_increment,
                'start_time'         => $startTime,
                'end_time'           => $endTime,
                'status'             => 'active',
            ]);

            // 2. Mark bidding request as approved
            $biddingRequest->update([
                'status'       => 'approved',
                'admin_note'   => $request->input('admin_note'),
                'reviewed_by'  => $admin->id,
                'reviewed_at'  => $startTime,
            ]);

            return $auction;
        });

        return response()->json([
            'message'         => "Bidding request #{$biddingRequest->id} APPROVED. Live auction #{$auction->id} is now ACTIVE until {$auction->end_time->toDayDateTimeString()}.",
            'auction'         => $auction->load('property'),
            'bidding_request' => $biddingRequest->fresh(['reviewer', 'auction']),
        ]);
    }

    /**
     * Admin rejects a seller's bidding request with a required explanatory note.
     *
     * POST /api/admin/bidding-requests/{id}/reject
     */
    public function reject(Request $request, int $id): JsonResponse
    {
        $admin = $request->user();

        $validated = $request->validate([
            'admin_note' => ['required', 'string', 'min:5', 'max:2000'],
        ]);

        $biddingRequest = BiddingRequest::find($id);

        if (!$biddingRequest) {
            return response()->json(['message' => 'Bidding request not found.'], 404);
        }

        if ($biddingRequest->status !== 'pending') {
            return response()->json([
                'message' => "This request has already been {$biddingRequest->status}.",
            ], 422);
        }

        $biddingRequest->update([
            'status'      => 'rejected',
            'admin_note'  => $validated['admin_note'],
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
        ]);

        return response()->json([
            'message'         => "Bidding request #{$biddingRequest->id} has been REJECTED.",
            'bidding_request' => $biddingRequest->fresh(['reviewer']),
        ]);
    }
}
