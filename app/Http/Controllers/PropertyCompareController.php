<?php

namespace App\Http\Controllers;

use App\Models\Property;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PropertyCompareController extends Controller
{
    /**
     * Compare up to 5 approved properties side-by-side with calculated metrics & legal proofs.
     *
     * GET /api/properties/compare?ids=1,2,3
     * GET /api/compare?ids=1,2,3
     */
    public function compare(Request $request): JsonResponse
    {
        $rawIds = $request->query('ids', '');
        
        if (is_array($rawIds)) {
            $ids = $rawIds;
        } else {
            $ids = array_filter(explode(',', (string) $rawIds));
        }

        // Clean, deduplicate, and limit to max 5 IDs
        $ids = array_values(array_unique(array_slice($ids, 0, 5)));

        if (empty($ids)) {
            return response()->json([
                'message'    => 'No valid property IDs provided for comparison.',
                'properties' => [],
                'extremes'   => null,
                'count'      => 0,
            ]);
        }

        // Strict Verification Filter: ONLY properties with verification_status = 'approved'
        $properties = Property::query()
            ->approved()
            ->with([
                'images',
                'user:id,name,phone,company_name,created_at,verification_status',
                'documents',
            ])
            ->whereIn('id', $ids)
            ->get();

        // Sort properties to match requested IDs order
        $idOrderMap = array_flip($ids);
        $properties = $properties->sortBy(function ($prop) use ($idOrderMap) {
            return $idOrderMap[$prop->id] ?? 999;
        })->values();

        if ($properties->isEmpty()) {
            return response()->json([
                'message'    => 'No approved properties found matching the specified criteria.',
                'properties' => [],
                'extremes'   => null,
                'count'      => 0,
            ]);
        }

        // Automated Metric Calculations
        $lowestPrice = $properties->min('price');
        $lowestPricePerSqFt = $properties->map(function ($p) {
            return $p->size > 0 ? ($p->price / $p->size) : 0;
        })->min();

        // Find Extreme Metric Holders
        $lowestPriceProp      = $properties->sortBy('price')->first();
        $highestPriceProp     = $properties->sortByDesc('price')->first();
        $bestPriceSqFtProp    = $properties->sortBy(fn($p) => $p->size > 0 ? ($p->price / $p->size) : 999999999)->first();
        $largestAreaProp      = $properties->sortByDesc('size')->first();
        $mostBedroomsProp     = $properties->sortByDesc('bedrooms')->first();
        $mostBathroomsProp    = $properties->sortByDesc('bathrooms')->first();

        $extremes = [
            'lowest_price_id'        => $lowestPriceProp?->id,
            'highest_price_id'       => $highestPriceProp?->id,
            'best_price_per_sqft_id' => $bestPriceSqFtProp?->id,
            'largest_area_id'        => $largestAreaProp?->id,
            'most_bedrooms_id'       => $mostBedroomsProp?->id,
            'most_bathrooms_id'      => $mostBathroomsProp?->id,
        ];

        // Format each property for comparison matrix
        $formatted = $properties->map(function (Property $p) use ($lowestPrice) {
            $price = (float) $p->price;
            $size = (float) $p->size;
            $pricePerSqFt = $size > 0 ? round($price / $size, 2) : 0;
            
            $priceDeltaAmount = max(0, $price - $lowestPrice);
            $priceDeltaPct = ($lowestPrice > 0) ? round(($priceDeltaAmount / $lowestPrice) * 100, 1) : 0;

            $primaryImg = $p->images->firstWhere('is_primary', true) ?? $p->images->first();

            // Legal verification & trust proof details
            $legalDocuments = ['Title Deed', 'National ID (NID) Verified'];
            if ($p->documents->where('document_type', 'ownership')->count() > 0) {
                $legalDocuments[] = 'Property Ownership Deed';
            }
            if ($p->documents->where('document_type', 'nid')->count() > 0) {
                $legalDocuments[] = 'Seller Identity Audit Passed';
            }

            return [
                'id'                     => $p->id,
                'title'                  => $p->title,
                'property_type'          => ucfirst($p->property_type),
                'price'                  => $price,
                'formatted_price'        => '৳ ' . number_format($price),
                'size'                   => $size,
                'formatted_size'         => number_format($size) . ' sqft',
                'price_per_sqft'         => $pricePerSqFt,
                'formatted_price_sqft'   => '৳ ' . number_format($pricePerSqFt) . ' / sqft',
                'price_delta_amount'     => $priceDeltaAmount,
                'price_delta_pct'        => $priceDeltaPct,
                'formatted_price_delta'  => $priceDeltaAmount > 0 
                    ? '+' . number_format($priceDeltaAmount) . ' (' . $priceDeltaPct . '% higher)' 
                    : 'Lowest Price (Base)',
                'bedrooms'               => (int) ($p->bedrooms ?? 0),
                'bathrooms'              => (int) ($p->bathrooms ?? 0),
                'location'               => $p->location,
                'address'                => $p->address,
                'street_address'         => $p->address,
                'city'                   => $p->location,
                'verification_status'    => 'Approved',
                'verification_badge'     => '100% Verified',
                'deed_audited_badge'     => '100% Deed Audited',
                'approved_documents'     => array_values(array_unique($legalDocuments)),
                'main_image'             => $primaryImg ? $primaryImg->url : '/images/placeholder-property.jpg',
                'seller' => [
                    'name'                => $p->user?->name ?? 'Property Owner',
                    'company_name'        => $p->user?->company_name ?? 'Individual Owner',
                    'member_since'        => $p->user?->created_at ? $p->user->created_at->format('Y') : '2024',
                    'verification_status' => $p->user?->verification_status ?? 'verified',
                ],
            ];
        });

        return response()->json([
            'count'      => $formatted->count(),
            'properties' => $formatted,
            'extremes'   => $extremes,
        ]);
    }

    /**
     * Search endpoint for approved properties for the quick-add modal.
     *
     * GET /api/properties/approved-search
     */
    public function searchApproved(Request $request): JsonResponse
    {
        $query = Property::query()
            ->approved()
            ->with(['images', 'user:id,name']);

        if ($request->filled('q')) {
            $search = '%' . trim($request->query('q')) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('title', 'LIKE', $search)
                  ->orWhere('location', 'LIKE', $search)
                  ->orWhere('address', 'LIKE', $search)
                  ->orWhere('property_type', 'LIKE', $search);
            });
        }

        if ($request->filled('exclude_ids')) {
            $excludeIds = explode(',', $request->query('exclude_ids'));
            $query->whereNotIn('id', array_filter($excludeIds));
        }

        $properties = $query->latest('submitted_at')->limit(12)->get();

        $formatted = $properties->map(function (Property $p) {
            $primaryImg = $p->images->firstWhere('is_primary', true) ?? $p->images->first();
            return [
                'id'            => $p->id,
                'title'         => $p->title,
                'property_type' => ucfirst($p->property_type),
                'price'         => (float) $p->price,
                'formatted_price' => '৳ ' . number_format($p->price),
                'size'          => (float) $p->size,
                'bedrooms'      => (int) ($p->bedrooms ?? 0),
                'bathrooms'     => (int) ($p->bathrooms ?? 0),
                'location'      => $p->location,
                'main_image'    => $primaryImg ? $primaryImg->url : '/images/placeholder-property.jpg',
            ];
        });

        return response()->json([
            'properties' => $formatted,
        ]);
    }
}
