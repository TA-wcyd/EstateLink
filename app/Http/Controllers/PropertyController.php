<?php

namespace App\Http\Controllers;

use App\Models\Property;
use App\Models\PropertyDocument;
use App\Models\PropertyImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class PropertyController extends Controller
{
    /**
     * Property types supported by EstateLink.
     */
    public const PROPERTY_TYPES = [
        'apartment',
        'house',
        'land',
        'commercial',
        'villa',
        'duplex',
        'studio',
        'other',
    ];

    /**
     * Transaction statuses supported by EstateLink.
     */
    public const TRANSACTION_STATUSES = [
        'available',
        'negotiation',
        'meeting_scheduled',
        'agreement_reached',
        'sold',
    ];

    /* =========================================================================
       PUBLIC ENDPOINTS (No Authentication Required)
       ========================================================================= */

    /**
     * Display a paginated list of APPROVED properties only.
     * Pending, rejected, or draft properties are strictly filtered out at DB level.
     *
     * GET /api/properties
     */
    public function index(Request $request): JsonResponse
    {
        $query = Property::query()
            ->approved()
            ->with(['images', 'user:id,name,phone,company_name,verification_status'])
            ->latest('submitted_at');

        // Optional filter: property_type
        if ($request->filled('property_type')) {
            $query->where('property_type', $request->query('property_type'));
        }

        // Optional filter: search keyword (title, location, address)
        if ($request->filled('search')) {
            $search = '%' . trim($request->query('search')) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('title', 'ILIKE', $search)
                  ->orWhere('location', 'ILIKE', $search)
                  ->orWhere('address', 'ILIKE', $search);
            });
        }

        // Optional filter: min_price / max_price
        if ($request->filled('min_price')) {
            $query->where('price', '>=', (float)$request->query('min_price'));
        }
        if ($request->filled('max_price')) {
            $query->where('price', '<=', (float)$request->query('max_price'));
        }

        // Optional filter: bedrooms
        if ($request->filled('bedrooms')) {
            $query->where('bedrooms', '>=', (int)$request->query('bedrooms'));
        }

        // Optional filter: transaction_status
        if ($request->filled('transaction_status')) {
            $query->where('transaction_status', $request->query('transaction_status'));
        }

        $perPage = min(max((int)$request->query('per_page', 9), 1), 50);
        $paginator = $query->paginate($perPage);

        // Map items to sanitize and ensure only public data is exposed
        $paginator->getCollection()->transform(function (Property $property) {
            return $this->formatPublicProperty($property);
        });

        return response()->json($paginator);
    }

    /**
     * Display a single APPROVED property for public view.
     *
     * GET /api/properties/{id}
     */
    public function show(int $id): JsonResponse
    {
        $property = Property::query()
            ->approved()
            ->with(['images', 'user:id,name,phone,company_name,verification_status'])
            ->find($id);

        if (!$property) {
            return response()->json([
                'message' => 'Property not found or is currently awaiting verification.',
            ], 404);
        }

        return response()->json([
            'property' => $this->formatPublicProperty($property, true),
        ]);
    }

    /* =========================================================================
       SELLER ENDPOINTS (auth:sanctum Required)
       ========================================================================= */

    /**
     * List all properties created by the currently authenticated seller/user.
     *
     * GET /api/my-properties
     */
    public function myProperties(Request $request): JsonResponse
    {
        $properties = Property::query()
            ->where('user_id', $request->user()->id)
            ->with(['images', 'documents'])
            ->latest()
            ->get();

        $formatted = $properties->map(function (Property $property) {
            return $this->formatSellerProperty($property);
        });

        return response()->json([
            'properties' => $formatted,
            'summary' => [
                'total'    => $properties->count(),
                'approved' => $properties->where('verification_status', 'approved')->count(),
                'pending'  => $properties->where('verification_status', 'pending')->count(),
                'rejected' => $properties->where('verification_status', 'rejected')->count(),
            ],
        ]);
    }

    /**
     * Retrieve a specific property owned by the authenticated seller.
     *
     * GET /api/my-properties/{id}
     */
    public function showMyProperty(Request $request, int $id): JsonResponse
    {
        $property = Property::query()
            ->where('user_id', $request->user()->id)
            ->with(['images', 'documents'])
            ->find($id);

        if (!$property) {
            return response()->json(['message' => 'Property not found.'], 404);
        }

        return response()->json([
            'property' => $this->formatSellerProperty($property, true),
        ]);
    }

    /**
     * Create a new property listing with images and verification documents.
     * Sets verification_status to 'pending'.
     *
     * POST /api/properties
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title'               => ['required', 'string', 'max:255'],
            'property_type'       => ['required', 'string', Rule::in(self::PROPERTY_TYPES)],
            'description'         => ['required', 'string', 'min:5'],
            'price'               => ['required', 'numeric', 'min:0'],
            'size'                => ['required', 'numeric', 'min:1'],
            'bedrooms'            => ['nullable', 'numeric', 'min:0', 'max:50'],
            'bathrooms'           => ['nullable', 'numeric', 'min:0', 'max:50'],
            'location'            => ['required', 'string', 'max:255'],
            'address'             => ['required', 'string', 'max:1000'],
            'phone'               => ['nullable', 'string', 'max:30'],
            'transaction_status'  => ['nullable', 'string', Rule::in(self::TRANSACTION_STATUSES)],
            
            // Image uploads
            'images'              => ['nullable', 'array', 'max:15'],
            'images.*'            => ['file', 'image', 'mimes:jpeg,png,jpg,webp,gif', 'max:20480'],
            
            // Verification documents
            'nid_document'        => ['nullable', 'file', 'mimes:jpeg,png,jpg,pdf,webp', 'max:20480'],
            'property_document'   => ['nullable', 'file', 'mimes:jpeg,png,jpg,pdf,webp', 'max:20480'],
        ]);

        $user = $request->user();

        $property = DB::transaction(function () use ($validated, $user, $request) {
            $prop = Property::create([
                'user_id'             => $user->id,
                'title'               => $validated['title'],
                'property_type'       => $validated['property_type'],
                'description'         => $validated['description'],
                'price'               => $validated['price'],
                'size'                => $validated['size'],
                'bedrooms'            => !empty($validated['bedrooms']) ? (int)$validated['bedrooms'] : null,
                'bathrooms'           => !empty($validated['bathrooms']) ? (int)$validated['bathrooms'] : null,
                'location'            => $validated['location'],
                'address'             => $validated['address'],
                'phone'               => !empty($validated['phone']) ? $validated['phone'] : ($user->phone ?? 'N/A'),
                'verification_status' => 'pending',
                'transaction_status'  => $validated['transaction_status'] ?? 'available',
                'submitted_at'        => now(),
            ]);

            // Save Property Images (first image is marked as primary)
            if ($request->hasFile('images')) {
                $files = $request->file('images');
                foreach ($files as $index => $file) {
                    $path = $file->store('properties/images', 'public');
                    PropertyImage::create([
                        'property_id' => $prop->id,
                        'image_path'  => $path,
                        'is_primary'  => ($index === 0),
                        'sort_order'  => $index,
                    ]);
                }
            }

            // Save NID document (private local disk)
            if ($request->hasFile('nid_document')) {
                $file = $request->file('nid_document');
                $path = $file->store('private/documents/nid', 'local');
                PropertyDocument::create([
                    'property_id'   => $prop->id,
                    'document_type' => 'nid',
                    'document_path' => $path,
                    'original_name' => $file->getClientOriginalName(),
                ]);
            }

            // Save Property Ownership document (private local disk)
            if ($request->hasFile('property_document')) {
                $file = $request->file('property_document');
                $path = $file->store('private/documents/ownership', 'local');
                PropertyDocument::create([
                    'property_id'   => $prop->id,
                    'document_type' => 'ownership',
                    'document_path' => $path,
                    'original_name' => $file->getClientOriginalName(),
                ]);
            }

            return $prop;
        });

        $property->load(['images', 'documents']);

        return response()->json([
            'message'  => 'Your property has been submitted and is waiting for Admin verification.',
            'property' => $this->formatSellerProperty($property, true),
        ], 201);
    }

    /**
     * Update an existing property owned by the user.
     *
     * PUT/POST /api/my-properties/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $property = Property::query()
            ->where('user_id', $request->user()->id)
            ->find($id);

        if (!$property) {
            return response()->json(['message' => 'Property not found.'], 404);
        }

        $validated = $request->validate([
            'title'              => ['sometimes', 'required', 'string', 'max:255'],
            'property_type'      => ['sometimes', 'required', 'string', Rule::in(self::PROPERTY_TYPES)],
            'description'        => ['sometimes', 'required', 'string', 'min:5'],
            'price'              => ['sometimes', 'required', 'numeric', 'min:0'],
            'size'               => ['sometimes', 'required', 'numeric', 'min:1'],
            'bedrooms'           => ['nullable', 'numeric', 'min:0', 'max:50'],
            'bathrooms'          => ['nullable', 'numeric', 'min:0', 'max:50'],
            'location'           => ['sometimes', 'required', 'string', 'max:255'],
            'address'            => ['sometimes', 'required', 'string', 'max:1000'],
            'phone'              => ['nullable', 'string', 'max:30'],
            'transaction_status' => ['nullable', 'string', Rule::in(self::TRANSACTION_STATUSES)],
            
            'images'             => ['nullable', 'array', 'max:15'],
            'images.*'           => ['file', 'image', 'mimes:jpeg,png,jpg,webp,gif', 'max:20480'],
            'nid_document'       => ['nullable', 'file', 'mimes:jpeg,png,jpg,pdf,webp', 'max:20480'],
            'property_document'  => ['nullable', 'file', 'mimes:jpeg,png,jpg,pdf,webp', 'max:20480'],
        ]);

        DB::transaction(function () use ($property, $validated, $request) {
            $fields = array_intersect_key($validated, array_flip([
                'title', 'property_type', 'description', 'price', 'size',
                'bedrooms', 'bathrooms', 'location', 'address', 'phone', 'transaction_status'
            ]));

            $property->update($fields);

            // Handle new images
            if ($request->hasFile('images')) {
                $hasExistingPrimary = $property->images()->where('is_primary', true)->exists();
                $existingCount = $property->images()->count();

                foreach ($request->file('images') as $i => $file) {
                    $path = $file->store('properties/images', 'public');
                    PropertyImage::create([
                        'property_id' => $property->id,
                        'image_path'  => $path,
                        'is_primary'  => (!$hasExistingPrimary && $i === 0),
                        'sort_order'  => $existingCount + $i,
                    ]);
                }
            }

            // Handle new NID document
            if ($request->hasFile('nid_document')) {
                // Delete old NID document if any
                $oldNid = $property->documents()->where('document_type', 'nid')->first();
                if ($oldNid) {
                    Storage::disk('local')->delete($oldNid->document_path);
                    $oldNid->delete();
                }

                $file = $request->file('nid_document');
                $path = $file->store('private/documents/nid', 'local');
                PropertyDocument::create([
                    'property_id'   => $property->id,
                    'document_type' => 'nid',
                    'document_path' => $path,
                    'original_name' => $file->getClientOriginalName(),
                ]);
            }

            // Handle new Property Ownership document
            if ($request->hasFile('property_document')) {
                $oldDoc = $property->documents()->where('document_type', 'ownership')->first();
                if ($oldDoc) {
                    Storage::disk('local')->delete($oldDoc->document_path);
                    $oldDoc->delete();
                }

                $file = $request->file('property_document');
                $path = $file->store('private/documents/ownership', 'local');
                PropertyDocument::create([
                    'property_id'   => $property->id,
                    'document_type' => 'ownership',
                    'document_path' => $path,
                    'original_name' => $file->getClientOriginalName(),
                ]);
            }
        });

        $property->load(['images', 'documents']);

        return response()->json([
            'message'  => 'Property updated successfully.',
            'property' => $this->formatSellerProperty($property, true),
        ]);
    }

    /**
     * Resubmit a rejected property for Admin review.
     *
     * POST /api/my-properties/{id}/resubmit
     */
    public function resubmit(Request $request, int $id): JsonResponse
    {
        $property = Property::query()
            ->where('user_id', $request->user()->id)
            ->find($id);

        if (!$property) {
            return response()->json(['message' => 'Property not found.'], 404);
        }

        $property->update([
            'verification_status' => 'pending',
            'rejection_reason'    => null,
            'submitted_at'        => now(),
            'reviewed_at'         => null,
            'reviewed_by'         => null,
        ]);

        return response()->json([
            'message'  => 'Your property has been resubmitted and is waiting for Admin verification.',
            'property' => $this->formatSellerProperty($property->fresh(['images', 'documents']), true),
        ]);
    }

    /**
     * Delete a property owned by the user.
     *
     * DELETE /api/my-properties/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $property = Property::query()
            ->where('user_id', $request->user()->id)
            ->with(['images', 'documents'])
            ->find($id);

        if (!$property) {
            return response()->json(['message' => 'Property not found.'], 404);
        }

        // Clean up files from storage
        foreach ($property->images as $img) {
            Storage::disk('public')->delete($img->image_path);
        }
        foreach ($property->documents as $doc) {
            Storage::disk('local')->delete($doc->document_path);
        }

        $property->delete();

        return response()->json([
            'message' => 'Property deleted successfully.',
        ]);
    }

    /**
     * Delete a single image from a property.
     *
     * DELETE /api/my-properties/{id}/images/{imageId}
     */
    public function deleteImage(Request $request, int $id, int $imageId): JsonResponse
    {
        $property = Property::query()
            ->where('user_id', $request->user()->id)
            ->find($id);

        if (!$property) {
            return response()->json(['message' => 'Property not found.'], 404);
        }

        $image = PropertyImage::query()
            ->where('property_id', $property->id)
            ->find($imageId);

        if (!$image) {
            return response()->json(['message' => 'Image not found.'], 404);
        }

        Storage::disk('public')->delete($image->image_path);
        $wasPrimary = $image->is_primary;
        $image->delete();

        // If the deleted image was primary, assign primary to the first remaining image
        if ($wasPrimary) {
            $nextImage = $property->images()->first();
            if ($nextImage) {
                $nextImage->update(['is_primary' => true]);
            }
        }

        return response()->json([
            'message' => 'Image removed.',
            'images'  => $property->fresh('images')->images,
        ]);
    }

    /* =========================================================================
       HELPER FORMATTERS
       ========================================================================= */

    /**
     * Format property data for public consumption (sanitizes private data).
     */
    private function formatPublicProperty(Property $property, bool $detailed = false): array
    {
        $primaryImg = $property->images->firstWhere('is_primary', true) ?? $property->images->first();

        $data = [
            'id'                 => $property->id,
            'title'              => $property->title,
            'property_type'      => $property->property_type,
            'price'              => $property->price,
            'size'               => $property->size,
            'bedrooms'           => $property->bedrooms,
            'bathrooms'          => $property->bathrooms,
            'location'           => $property->location,
            'address'            => $property->address,
            'phone'              => $property->phone ?? $property->user?->phone,
            'transaction_status' => $property->transaction_status,
            'main_image'         => $primaryImg ? $primaryImg->url : null,
            'images'             => $property->images->map(fn($img) => [
                'id'         => $img->id,
                'url'        => $img->url,
                'is_primary' => $img->is_primary,
            ]),
            'seller' => [
                'name'                => $property->user?->name,
                'phone'               => $property->phone ?? $property->user?->phone,
                'company_name'        => $property->user?->company_name,
                'verification_status' => $property->user?->verification_status,
            ],
            'created_at' => $property->created_at,
        ];

        if ($detailed) {
            $data['description'] = $property->description;
        }

        return $data;
    }

    /**
     * Format property data for seller management (includes verification status, documents info).
     */
    private function formatSellerProperty(Property $property, bool $detailed = false): array
    {
        $primaryImg = $property->images->firstWhere('is_primary', true) ?? $property->images->first();

        return [
            'id'                  => $property->id,
            'title'               => $property->title,
            'property_type'       => $property->property_type,
            'description'         => $property->description,
            'price'               => $property->price,
            'size'                => $property->size,
            'bedrooms'            => $property->bedrooms,
            'bathrooms'           => $property->bathrooms,
            'location'            => $property->location,
            'address'             => $property->address,
            'phone'               => $property->phone ?? $property->user?->phone,
            'verification_status' => $property->verification_status,
            'rejection_reason'    => $property->rejection_reason,
            'transaction_status'  => $property->transaction_status,
            'submitted_at'        => $property->submitted_at,
            'reviewed_at'         => $property->reviewed_at,
            'created_at'          => $property->created_at,
            'updated_at'          => $property->updated_at,
            'main_image'          => $primaryImg ? $primaryImg->url : null,
            'images'              => $property->images->map(fn($img) => [
                'id'         => $img->id,
                'url'        => $img->url,
                'is_primary' => $img->is_primary,
            ]),
            'documents'           => $property->documents->map(fn($doc) => [
                'id'            => $doc->id,
                'document_type' => $doc->document_type,
                'original_name' => $doc->original_name,
                'created_at'    => $doc->created_at,
            ]),
        ];
    }
}
