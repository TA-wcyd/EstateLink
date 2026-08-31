<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Property extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'property_type',
        'description',
        'price',
        'size',
        'bedrooms',
        'bathrooms',
        'location',
        'address',
        'phone',
        'verification_status',
        'rejection_reason',
        'submitted_at',
        'reviewed_at',
        'reviewed_by',
        'transaction_status',
    ];

    protected $casts = [
        'price'        => 'float',
        'size'         => 'float',
        'bedrooms'     => 'integer',
        'bathrooms'    => 'integer',
        'submitted_at' => 'datetime',
        'reviewed_at'  => 'datetime',
    ];

    /**
     * The owner / seller of the property.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Admin who reviewed/verified the property.
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /**
     * All images associated with this property.
     */
    public function images(): HasMany
    {
        return $this->hasMany(PropertyImage::class)->orderBy('sort_order')->orderBy('id');
    }

    /**
     * Primary showcase image.
     */
    public function primaryImage()
    {
        return $this->hasOne(PropertyImage::class)->where('is_primary', true);
    }

    /**
     * Private verification documents (NID, ownership, etc.).
     */
    public function documents(): HasMany
    {
        return $this->hasMany(PropertyDocument::class);
    }

    /**
     * Scope to query only approved properties for public display.
     */
    public function scopeApproved(Builder $query): Builder
    {
        return $query->where('verification_status', 'approved');
    }

    /**
     * Scope to query pending properties awaiting admin verification.
     */
    public function scopePending(Builder $query): Builder
    {
        return $query->where('verification_status', 'pending');
    }

    /**
     * Helper to check if property is approved.
     */
    public function isApproved(): bool
    {
        return $this->verification_status === 'approved';
    }

    /**
     * Helper to check if property is rejected.
     */
    public function isRejected(): bool
    {
        return $this->verification_status === 'rejected';
    }

    /**
     * Helper to check if property is pending.
     */
    public function isPending(): bool
    {
        return $this->verification_status === 'pending';
    }
}
