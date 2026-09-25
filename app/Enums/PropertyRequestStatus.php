<?php

namespace App\Enums;

enum PropertyRequestStatus: string
{
    case PENDING_SELLER_APPROVAL = 'pending_seller_approval';
    case DECLINED_BY_SELLER      = 'declined_by_seller';
    case FORWARDED_TO_ADMIN      = 'forwarded_to_admin';
    case SCHEDULE_FIXED          = 'schedule_fixed';
    case INSPECTION_COMPLETED    = 'inspection_completed';
    case SALE_CONFIRMED          = 'sale_confirmed';
    case CANCELLED               = 'cancelled';

    /**
     * Human-readable label for status.
     */
    public function label(): string
    {
        return match ($this) {
            self::PENDING_SELLER_APPROVAL => 'Pending Seller Approval',
            self::DECLINED_BY_SELLER      => 'Declined by Seller',
            self::FORWARDED_TO_ADMIN      => 'Forwarded to Admin',
            self::SCHEDULE_FIXED          => 'Inspection Scheduled',
            self::INSPECTION_COMPLETED    => 'Inspection Completed',
            self::SALE_CONFIRMED          => 'Sale Confirmed',
            self::CANCELLED               => 'Cancelled',
        };
    }

    /**
     * Checks if this request is considered active (not in a terminal status).
     */
    public function isActive(): bool
    {
        return !in_array($this, [
            self::DECLINED_BY_SELLER,
            self::SALE_CONFIRMED,
            self::CANCELLED,
        ]);
    }

    /**
     * Checks if this request locks the property in the admin review / inspection pipeline.
     */
    public function isLockedInAdminPipeline(): bool
    {
        return in_array($this, [
            self::FORWARDED_TO_ADMIN,
            self::SCHEDULE_FIXED,
            self::INSPECTION_COMPLETED,
        ]);
    }
}
