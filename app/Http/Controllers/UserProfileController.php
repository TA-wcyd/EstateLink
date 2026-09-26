<?php

namespace App\Http\Controllers;

use App\Models\Property;
use App\Models\PropertySale;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserProfileController extends Controller
{
    /**
     * Get public user profile details, stats, and approved listings.
     *
     * GET /api/users/{id}/public-profile
     */
    public function showPublicProfile(int $id, Request $request): JsonResponse
    {
        /** @var User|null $targetUser */
        $targetUser = User::find($id);

        if (!$targetUser) {
            return response()->json([
                'message' => 'User profile not found.',
            ], 404);
        }

        /** @var User|null $currentUser */
        $currentUser = $request->user();
        $isOwnProfile = $currentUser ? ($currentUser->id === $targetUser->id) : false;

        // Public approved property listings
        $approvedProperties = Property::where('user_id', $targetUser->id)
            ->approved()
            ->with(['images'])
            ->latest()
            ->get()
            ->map(function ($prop) {
                return [
                    'id'                 => $prop->id,
                    'title'              => $prop->title,
                    'price'              => $prop->price,
                    'property_type'      => $prop->property_type,
                    'transaction_status' => $prop->transaction_status,
                    'location'           => $prop->location,
                    'address'            => $prop->address,
                    'bedrooms'           => $prop->bedrooms,
                    'bathrooms'          => $prop->bathrooms,
                    'size'               => $prop->size,
                    'cover_image'        => $prop->images->first()?->image_path ? asset('storage/' . $prop->images->first()->image_path) : null,
                    'created_at'         => $prop->created_at,
                ];
            });

        // Activity Stats
        $completedSales = PropertySale::where('seller_id', $targetUser->id)->count();
        $completedPurchases = PropertySale::where('buyer_id', $targetUser->id)->count();

        return response()->json([
            'user' => [
                'id'                  => $targetUser->id,
                'name'                => $targetUser->name,
                'role'                => $targetUser->role,
                'company_name'        => $targetUser->company_name,
                'facebook_url'        => $targetUser->facebook_url,
                'phone'               => $targetUser->phone, // Public contact
                'verification_status' => $targetUser->verification_status,
                'is_verified'         => $targetUser->isVerified(),
                'is_banned'           => $targetUser->is_banned,
                'created_at'          => $targetUser->created_at,
            ],
            'stats' => [
                'total_listings'     => $approvedProperties->count(),
                'completed_sales'    => $completedSales,
                'completed_purchases'=> $completedPurchases,
            ],
            'properties'     => $approvedProperties,
            'is_own_profile' => $isOwnProfile,
            'can_report'     => $currentUser && !$isOwnProfile && !$targetUser->is_banned,
        ]);
    }
}
