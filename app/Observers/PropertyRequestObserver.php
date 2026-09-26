<?php

namespace App\Observers;

use App\Models\PropertyRequest;
use App\Services\ChatService;

class PropertyRequestObserver
{
    protected ChatService $chatService;

    public function __construct(ChatService $chatService)
    {
        $this->chatService = $chatService;
    }

    /**
     * Handle the PropertyRequest "updated" event.
     */
    public function updated(PropertyRequest $propertyRequest): void
    {
        $this->chatService->closeRoomIfNeeded($propertyRequest);
    }
}
