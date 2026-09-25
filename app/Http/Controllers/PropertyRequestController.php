<?php

namespace App\Http\Controllers;

use App\Enums\PropertyRequestStatus;
use App\Models\Property;
use App\Models\PropertyRequest;
use App\Models\PropertySale;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PropertyRequestController extends Controller
{
    /* =========================================================================
       BUYER ENDPOINTS
       ========================================================================= */

    /**
     * Submit a purchase / inspection request for an available approved property.
     *
     * POST /api/properties/{id}/requests
     */
    public function store(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $property = Property::query()->approved()->with('images')->find($id);

        if (!$property) {
            return response()->json([
                'message' => 'Property not found or is not approved for purchase requests.',
            ], 404);
        }

        // Rule: Property must be available for new requests
        if ($property->transaction_status === 'sold') {
            return response()->json([
                'message' => 'This property has already been sold and is no longer accepting requests.',
            ], 422);
        }

        // Rule: Buyer cannot submit a request on their own property
        if ($property->user_id === $user->id) {
            return response()->json([
                'message' => 'You cannot submit a purchase or inspection request on your own property.',
            ], 403);
        }

        // Rule: Buyer cannot submit a second active request on the same property
        $existingActiveRequest = PropertyRequest::query()
            ->where('property_id', $property->id)
            ->where('buyer_id', $user->id)
            ->active()
            ->first();

        if ($existingActiveRequest) {
            return response()->json([
                'message' => 'You already have an active request for this property.',
                'active_request_id' => $existingActiveRequest->id,
                'status' => $existingActiveRequest->status->value,
            ], 422);
        }

        // Validation - Strictly enforces that NO phone/email/contact info is provided or stored
        $validated = $request->validate([
            'offered_amount' => ['required', 'numeric', 'min:1'],
            'preferred_date' => ['required', 'date', 'after_or_equal:today'],
            'buyer_notes'    => ['nullable', 'string', 'max:2000'],
        ]);

        $propertyRequest = PropertyRequest::create([
            'property_id'    => $property->id,
            'buyer_id'       => $user->id,
            'seller_id'      => $property->user_id,
            'offered_amount' => $validated['offered_amount'],
            'preferred_date' => $validated['preferred_date'],
            'buyer_notes'    => $validated['buyer_notes'] ?? null,
            'status'         => PropertyRequestStatus::PENDING_SELLER_APPROVAL,
        ]);

        return response()->json([
            'message' => 'Your purchase and inspection request has been submitted to the seller for approval.',
            'request' => $propertyRequest->fresh(['property.images', 'seller'])->formatForBuyer(),
        ], 201);
    }

    /**
     * View purchase requests submitted by the authenticated buyer.
     *
     * GET /api/buyer/requests
     */
    public function buyerIndex(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = PropertyRequest::query()
            ->where('buyer_id', $user->id)
            ->with(['property.images', 'seller'])
            ->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        $requests = $query->paginate((int)$request->query('per_page', 15));

        $requests->getCollection()->transform(function (PropertyRequest $req) {
            return $req->formatForBuyer();
        });

        return response()->json($requests);
    }

    /**
     * View a single purchase request submitted by the buyer.
     *
     * GET /api/buyer/requests/{id}
     */
    public function buyerShow(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $propertyRequest = PropertyRequest::query()
            ->where('id', $id)
            ->where('buyer_id', $user->id)
            ->with(['property.images', 'seller'])
            ->first();

        if (!$propertyRequest) {
            return response()->json(['message' => 'Request not found.'], 404);
        }

        return response()->json([
            'request' => $propertyRequest->formatForBuyer(),
        ]);
    }

    /* =========================================================================
       SELLER ENDPOINTS
       ========================================================================= */

    /**
     * View incoming requests for the authenticated seller's properties.
     *
     * GET /api/seller/requests
     */
    public function sellerIndex(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = PropertyRequest::query()
            ->where('seller_id', $user->id)
            ->with(['property.images', 'buyer'])
            ->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('property_id')) {
            $query->where('property_id', (int)$request->query('property_id'));
        }

        $requests = $query->paginate((int)$request->query('per_page', 15));

        $requests->getCollection()->transform(function (PropertyRequest $req) {
            return $req->formatForSeller();
        });

        return response()->json($requests);
    }

    /**
     * Seller declines a purchase request.
     *
     * POST /api/seller/requests/{id}/decline
     */
    public function sellerDecline(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $propertyRequest = PropertyRequest::query()
            ->where('id', $id)
            ->where('seller_id', $user->id)
            ->first();

        if (!$propertyRequest) {
            return response()->json(['message' => 'Request not found or not owned by you.'], 404);
        }

        if ($propertyRequest->status !== PropertyRequestStatus::PENDING_SELLER_APPROVAL) {
            return response()->json([
                'message' => 'Only requests with pending seller approval can be declined.',
            ], 422);
        }

        $validated = $request->validate([
            'seller_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $propertyRequest->update([
            'status'       => PropertyRequestStatus::DECLINED_BY_SELLER,
            'seller_notes' => $validated['seller_notes'] ?? null,
        ]);

        return response()->json([
            'message' => 'Purchase request has been declined.',
            'request' => $propertyRequest->fresh(['property.images', 'buyer'])->formatForSeller(),
        ]);
    }

    /**
     * Seller approves and forwards a purchase request to admin for inspection.
     * Enforces §5 Locking Rule: Only ONE request per property can be forwarded to admin at a time.
     *
     * POST /api/seller/requests/{id}/forward
     */
    public function sellerForward(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $propertyRequest = PropertyRequest::query()
            ->where('id', $id)
            ->where('seller_id', $user->id)
            ->with('property')
            ->first();

        if (!$propertyRequest) {
            return response()->json(['message' => 'Request not found or not owned by you.'], 404);
        }

        if ($propertyRequest->status !== PropertyRequestStatus::PENDING_SELLER_APPROVAL) {
            return response()->json([
                'message' => 'Only requests awaiting seller approval can be forwarded to admin.',
            ], 422);
        }

        // LOCKING RULE (§5): Can only forward ONE request per property at a time
        $existingLockedRequest = PropertyRequest::query()
            ->where('property_id', $propertyRequest->property_id)
            ->where('id', '!=', $propertyRequest->id)
            ->whereIn('status', [
                PropertyRequestStatus::FORWARDED_TO_ADMIN->value,
                PropertyRequestStatus::SCHEDULE_FIXED->value,
                PropertyRequestStatus::INSPECTION_COMPLETED->value,
            ])
            ->first();

        if ($existingLockedRequest) {
            return response()->json([
                'message' => 'Another request for this property is already undergoing inspection with the Admin. Only one request may be forwarded to Admin at a time.',
                'active_forwarded_request_id' => $existingLockedRequest->id,
            ], 422);
        }

        $validated = $request->validate([
            'seller_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($propertyRequest, $validated) {
            $propertyRequest->update([
                'status'       => PropertyRequestStatus::FORWARDED_TO_ADMIN,
                'seller_notes' => $validated['seller_notes'] ?? $propertyRequest->seller_notes,
            ]);

            // Update property listing transaction status to negotiation / inspection
            $propertyRequest->property->update([
                'transaction_status' => 'negotiation',
            ]);
        });

        return response()->json([
            'message' => 'Request approved and forwarded to Admin for scheduling inspection.',
            'request' => $propertyRequest->fresh(['property.images', 'buyer'])->formatForSeller(),
        ]);
    }

    /* =========================================================================
       ADMIN ENDPOINTS (Strictly sequential: Schedule -> Conduct -> Confirm/Cancel)
       ========================================================================= */

    /**
     * View the global inspection queue.
     *
     * GET /api/admin/requests/queue
     */
    public function adminQueue(Request $request): JsonResponse
    {
        $query = PropertyRequest::query()
            ->with(['property.images', 'buyer', 'seller', 'confirmer', 'canceller'])
            ->latest('updated_at');

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        } else {
            // Default to viewing active admin pipeline
            $query->whereIn('status', [
                PropertyRequestStatus::FORWARDED_TO_ADMIN->value,
                PropertyRequestStatus::SCHEDULE_FIXED->value,
                PropertyRequestStatus::INSPECTION_COMPLETED->value,
            ]);
        }

        $requests = $query->paginate((int)$request->query('per_page', 15));

        $requests->getCollection()->transform(function (PropertyRequest $req) {
            return $req->formatForAdmin();
        });

        return response()->json($requests);
    }

    /**
     * Admin Step 3: Fix inspection schedule date/time + notes.
     *
     * POST /api/admin/requests/{id}/schedule
     */
    public function adminSchedule(Request $request, int $id): JsonResponse
    {
        $propertyRequest = PropertyRequest::query()
            ->with('property')
            ->find($id);

        if (!$propertyRequest) {
            return response()->json(['message' => 'Request not found.'], 404);
        }

        if (!in_array($propertyRequest->status, [
            PropertyRequestStatus::FORWARDED_TO_ADMIN,
            PropertyRequestStatus::SCHEDULE_FIXED,
        ])) {
            return response()->json([
                'message' => 'Cannot fix inspection schedule. Request must be in FORWARDED_TO_ADMIN status.',
            ], 422);
        }

        $validated = $request->validate([
            'inspection_scheduled_at' => ['required', 'date', 'after_or_equal:now'],
            'inspection_notes'        => ['nullable', 'string', 'max:2000'],
        ]);

        DB::transaction(function () use ($propertyRequest, $validated) {
            $propertyRequest->update([
                'status'                  => PropertyRequestStatus::SCHEDULE_FIXED,
                'inspection_scheduled_at' => $validated['inspection_scheduled_at'],
                'inspection_notes'        => $validated['inspection_notes'] ?? null,
            ]);

            $propertyRequest->property->update([
                'transaction_status' => 'meeting_scheduled',
            ]);
        });

        return response()->json([
            'message' => 'Inspection schedule has been fixed.',
            'request' => $propertyRequest->fresh(['property.images', 'buyer', 'seller'])->formatForAdmin(),
        ]);
    }

    /**
     * Admin Step 4: Mark inspection as conducted with findings.
     *
     * POST /api/admin/requests/{id}/complete-inspection
     */
    public function adminCompleteInspection(Request $request, int $id): JsonResponse
    {
        $propertyRequest = PropertyRequest::query()->find($id);

        if (!$propertyRequest) {
            return response()->json(['message' => 'Request not found.'], 404);
        }

        // Strictly sequential: Must be in SCHEDULE_FIXED status
        if ($propertyRequest->status !== PropertyRequestStatus::SCHEDULE_FIXED) {
            return response()->json([
                'message' => 'Cannot complete inspection. Schedule must be fixed first.',
            ], 422);
        }

        $validated = $request->validate([
            'inspection_findings' => ['required', 'string', 'min:5', 'max:3000'],
        ]);

        $propertyRequest->update([
            'status'                  => PropertyRequestStatus::INSPECTION_COMPLETED,
            'inspection_completed_at' => now(),
            'inspection_findings'     => $validated['inspection_findings'],
        ]);

        return response()->json([
            'message' => 'Inspection marked as completed with findings recorded.',
            'request' => $propertyRequest->fresh(['property.images', 'buyer', 'seller'])->formatForAdmin(),
        ]);
    }

    /**
     * Admin Step 5A: Final Decision -> Confirm Sale.
     * Sets request to SALE_CONFIRMED, property to SOLD, creates PropertySale.
     *
     * POST /api/admin/requests/{id}/confirm-sale
     */
    public function adminConfirmSale(Request $request, int $id): JsonResponse
    {
        $admin = $request->user();

        $propertyRequest = PropertyRequest::query()
            ->with(['property', 'buyer', 'seller'])
            ->find($id);

        if (!$propertyRequest) {
            return response()->json(['message' => 'Request not found.'], 404);
        }

        // Strictly sequential: Must be in INSPECTION_COMPLETED status
        if ($propertyRequest->status !== PropertyRequestStatus::INSPECTION_COMPLETED) {
            return response()->json([
                'message' => 'Cannot confirm sale. Inspection must be completed before confirming sale.',
            ], 422);
        }

        $property = $propertyRequest->property;

        DB::transaction(function () use ($propertyRequest, $property, $admin) {
            // 1. Update this request to SALE_CONFIRMED
            $propertyRequest->update([
                'status'            => PropertyRequestStatus::SALE_CONFIRMED,
                'sale_confirmed_at' => now(),
                'confirmed_by'      => $admin->id,
            ]);

            // 2. Update property status to SOLD
            $property->update([
                'transaction_status' => 'sold',
            ]);

            // 3. Create completed PropertySale record
            PropertySale::create([
                'property_id' => $property->id,
                'auction_id'  => null,
                'seller_id'   => $propertyRequest->seller_id,
                'buyer_id'    => $propertyRequest->buyer_id,
                'final_price' => $propertyRequest->offered_amount,
                'sold_at'     => now(),
                'notes'       => "Sale confirmed following successful inspection. Findings: " . ($propertyRequest->inspection_findings ?? 'N/A'),
            ]);

            // 4. Automatically decline/cancel all other pending requests for this property
            PropertyRequest::query()
                ->where('property_id', $property->id)
                ->where('id', '!=', $propertyRequest->id)
                ->active()
                ->update([
                    'status'              => PropertyRequestStatus::CANCELLED,
                    'cancelled_at'        => now(),
                    'cancelled_by'        => $admin->id,
                    'cancellation_reason' => 'Property was sold to another buyer.',
                ]);
        });

        return response()->json([
            'message' => "Sale confirmed! Property #{$property->id} marked as SOLD.",
            'request' => $propertyRequest->fresh(['property.images', 'buyer', 'seller', 'confirmer'])->formatForAdmin(),
        ]);
    }

    /**
     * Admin Step 5B: Final Decision -> Cancel Deal.
     * Sets request to CANCELLED and rolls property back to AVAILABLE.
     *
     * POST /api/admin/requests/{id}/cancel
     */
    public function adminCancel(Request $request, int $id): JsonResponse
    {
        $admin = $request->user();

        $propertyRequest = PropertyRequest::query()
            ->with('property')
            ->find($id);

        if (!$propertyRequest) {
            return response()->json(['message' => 'Request not found.'], 404);
        }

        if (!in_array($propertyRequest->status, [
            PropertyRequestStatus::FORWARDED_TO_ADMIN,
            PropertyRequestStatus::SCHEDULE_FIXED,
            PropertyRequestStatus::INSPECTION_COMPLETED,
        ])) {
            return response()->json([
                'message' => 'Only active requests in the admin pipeline can be cancelled.',
            ], 422);
        }

        $validated = $request->validate([
            'cancellation_reason' => ['required', 'string', 'min:5', 'max:2000'],
        ]);

        DB::transaction(function () use ($propertyRequest, $validated, $admin) {
            // 1. Update request to CANCELLED
            $propertyRequest->update([
                'status'              => PropertyRequestStatus::CANCELLED,
                'cancelled_at'        => now(),
                'cancelled_by'        => $admin->id,
                'cancellation_reason' => $validated['cancellation_reason'],
            ]);

            // 2. Roll property back to available
            $propertyRequest->property->update([
                'transaction_status' => 'available',
            ]);
        });

        return response()->json([
            'message' => 'Deal cancelled. Property has been rolled back to available status.',
            'request' => $propertyRequest->fresh(['property.images', 'buyer', 'seller', 'canceller'])->formatForAdmin(),
        ]);
    }
}
