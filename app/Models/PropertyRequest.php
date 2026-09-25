<?php

namespace App\Models;

use App\Enums\PropertyRequestStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PropertyRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'property_id',
        'buyer_id',
        'seller_id',
        'offered_amount',
        'preferred_date',
        'buyer_notes',
        'seller_notes',
        'status',
        'inspection_scheduled_at',
        'inspection_notes',
        'inspection_completed_at',
        'inspection_findings',
        'sale_confirmed_at',
        'confirmed_by',
        'cancelled_at',
        'cancelled_by',
        'cancellation_reason',
    ];

    protected $casts = [
        'status'                  => PropertyRequestStatus::class,
        'offered_amount'          => 'float',
        'preferred_date'          => 'date:Y-m-d',
        'inspection_scheduled_at' => 'datetime',
        'inspection_completed_at' => 'datetime',
        'sale_confirmed_at'       => 'datetime',
        'cancelled_at'            => 'datetime',
    ];

    /* =========================================================================
       RELATIONSHIPS
       ========================================================================= */

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function confirmer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    public function canceller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    public function chatRoom(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(ChatRoom::class);
    }

    /* =========================================================================
       QUERY SCOPES
       ========================================================================= */

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNotIn('status', [
            PropertyRequestStatus::DECLINED_BY_SELLER->value,
            PropertyRequestStatus::SALE_CONFIRMED->value,
            PropertyRequestStatus::CANCELLED->value,
        ]);
    }

    public function scopeForBuyer(Builder $query, int $buyerId): Builder
    {
        return $query->where('buyer_id', $buyerId);
    }

    public function scopeForSeller(Builder $query, int $sellerId): Builder
    {
        return $query->where('seller_id', $sellerId);
    }

    public function scopeForwardedToAdmin(Builder $query): Builder
    {
        return $query->whereIn('status', [
            PropertyRequestStatus::FORWARDED_TO_ADMIN->value,
            PropertyRequestStatus::SCHEDULE_FIXED->value,
            PropertyRequestStatus::INSPECTION_COMPLETED->value,
        ]);
    }

    /* =========================================================================
       PRIVACY-SAFE DATA SERIALIZATION
       ========================================================================= */

    /**
     * Format payload for the Buyer.
     * HARD REQUIREMENT: No seller contact info, phone, email, or social handle.
     */
    public function formatForBuyer(): array
    {
        $primaryImg = $this->property?->images?->firstWhere('is_primary', true) 
            ?? $this->property?->images?->first();

        return [
            'id'                      => $this->id,
            'property_id'             => $this->property_id,
            'property_title'          => $this->property?->title,
            'property_location'       => $this->property?->location,
            'property_price'          => $this->property?->price,
            'property_image'          => $primaryImg?->url,
            'offered_amount'          => $this->offered_amount,
            'preferred_date'          => $this->preferred_date?->format('Y-m-d'),
            'buyer_notes'             => $this->buyer_notes,
            'seller_notes'            => $this->seller_notes,
            'status'                  => $this->status->value,
            'status_label'            => $this->status->label(),
            'inspection_scheduled_at' => $this->inspection_scheduled_at?->toIso8601String(),
            'inspection_notes'        => $this->inspection_notes,
            'inspection_completed_at' => $this->inspection_completed_at?->toIso8601String(),
            'inspection_findings'     => $this->inspection_findings,
            'sale_confirmed_at'       => $this->sale_confirmed_at?->toIso8601String(),
            'cancelled_at'            => $this->cancelled_at?->toIso8601String(),
            'cancellation_reason'     => $this->cancellation_reason,
            'created_at'              => $this->created_at?->toIso8601String(),
            // Seller info: strictly platform display name ONLY. Zero phone/email.
            'seller' => [
                'name' => $this->seller?->name ?? 'Verified Seller',
            ],
        ];
    }

    /**
     * Format payload for the Seller.
     * HARD REQUIREMENT: No buyer contact info, phone, email, or social handle.
     */
    public function formatForSeller(): array
    {
        $primaryImg = $this->property?->images?->firstWhere('is_primary', true) 
            ?? $this->property?->images?->first();

        return [
            'id'                      => $this->id,
            'property_id'             => $this->property_id,
            'property_title'          => $this->property?->title,
            'property_location'       => $this->property?->location,
            'property_price'          => $this->property?->price,
            'property_image'          => $primaryImg?->url,
            'offered_amount'          => $this->offered_amount,
            'preferred_date'          => $this->preferred_date?->format('Y-m-d'),
            'buyer_notes'             => $this->buyer_notes,
            'seller_notes'            => $this->seller_notes,
            'status'                  => $this->status->value,
            'status_label'            => $this->status->label(),
            'inspection_scheduled_at' => $this->inspection_scheduled_at?->toIso8601String(),
            'inspection_notes'        => $this->inspection_notes,
            'inspection_completed_at' => $this->inspection_completed_at?->toIso8601String(),
            'inspection_findings'     => $this->inspection_findings,
            'sale_confirmed_at'       => $this->sale_confirmed_at?->toIso8601String(),
            'cancelled_at'            => $this->cancelled_at?->toIso8601String(),
            'cancellation_reason'     => $this->cancellation_reason,
            'created_at'              => $this->created_at?->toIso8601String(),
            // Buyer info: strictly platform display name ONLY. Zero phone/email/NID.
            'buyer' => [
                'name' => $this->buyer?->name ?? 'Verified Buyer',
            ],
        ];
    }

    /**
     * Format payload for Administrator queue.
     */
    public function formatForAdmin(): array
    {
        $primaryImg = $this->property?->images?->firstWhere('is_primary', true) 
            ?? $this->property?->images?->first();

        return [
            'id'                      => $this->id,
            'property_id'             => $this->property_id,
            'property_title'          => $this->property?->title,
            'property_location'       => $this->property?->location,
            'property_address'        => $this->property?->address,
            'property_price'          => $this->property?->price,
            'property_image'          => $primaryImg?->url,
            'offered_amount'          => $this->offered_amount,
            'preferred_date'          => $this->preferred_date?->format('Y-m-d'),
            'buyer_notes'             => $this->buyer_notes,
            'seller_notes'            => $this->seller_notes,
            'status'                  => $this->status->value,
            'status_label'            => $this->status->label(),
            'inspection_scheduled_at' => $this->inspection_scheduled_at?->toIso8601String(),
            'inspection_notes'        => $this->inspection_notes,
            'inspection_completed_at' => $this->inspection_completed_at?->toIso8601String(),
            'inspection_findings'     => $this->inspection_findings,
            'sale_confirmed_at'       => $this->sale_confirmed_at?->toIso8601String(),
            'confirmed_by'            => $this->confirmer?->name,
            'cancelled_at'            => $this->cancelled_at?->toIso8601String(),
            'cancelled_by'            => $this->canceller?->name,
            'cancellation_reason'     => $this->cancellation_reason,
            'created_at'              => $this->created_at?->toIso8601String(),
            'buyer' => [
                'id'   => $this->buyer?->id,
                'name' => $this->buyer?->name,
            ],
            'seller' => [
                'id'   => $this->seller?->id,
                'name' => $this->seller?->name,
            ],
        ];
    }
}
