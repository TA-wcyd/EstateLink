<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Auction extends Model
{
    use HasFactory;

    protected $fillable = [
        'property_id',
        'bidding_request_id',
        'seller_id',
        'start_price',
        'min_increment',
        'start_time',
        'end_time',
        'status',
        'winning_bid_id',
        'seller_notes',
    ];

    protected $casts = [
        'start_price'   => 'float',
        'min_increment' => 'float',
        'start_time'    => 'datetime',
        'end_time'      => 'datetime',
    ];

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function biddingRequest(): BelongsTo
    {
        return $this->belongsTo(BiddingRequest::class);
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function bids(): HasMany
    {
        return $this->hasMany(Bid::class)->orderBy('amount', 'desc')->orderBy('placed_at', 'asc');
    }

    public function highestBid()
    {
        return $this->hasOne(Bid::class)->ofMany('amount', 'max');
    }

    public function winningBid(): BelongsTo
    {
        return $this->belongsTo(Bid::class, 'winning_bid_id');
    }

    public function propertySale(): HasOne
    {
        return $this->hasOne(PropertySale::class);
    }

    public function isActive(): bool
    {
        return $this->status === 'active' && now()->lt($this->end_time);
    }

    public function hasEnded(): bool
    {
        return now()->gte($this->end_time) || $this->status !== 'active';
    }

    public function getRemainingSecondsAttribute(): int
    {
        if ($this->hasEnded()) {
            return 0;
        }
        return (int) max(0, now()->diffInSeconds($this->end_time, false));
    }
}
