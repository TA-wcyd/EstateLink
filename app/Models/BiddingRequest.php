<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class BiddingRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'property_id',
        'user_id',
        'start_price',
        'min_increment',
        'duration_hours',
        'status',
        'admin_note',
        'reviewed_by',
        'requested_at',
        'reviewed_at',
    ];

    protected $casts = [
        'start_price'    => 'float',
        'min_increment'  => 'float',
        'duration_hours' => 'integer',
        'requested_at'   => 'datetime',
        'reviewed_at'    => 'datetime',
    ];

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function auction(): HasOne
    {
        return $this->hasOne(Auction::class);
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    public function isRejected(): bool
    {
        return $this->status === 'rejected';
    }
}
