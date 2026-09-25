<?php

namespace App\Services;

use App\Events\ChatClosed;
use App\Models\ChatRoom;
use App\Models\PropertyRequest;

class ChatService
{
    /**
     * Ensure a chat room exists for the given property request.
     */
    public function ensureRoom(PropertyRequest $request): ChatRoom
    {
        return ChatRoom::firstOrCreate(
            ['property_request_id' => $request->id],
            ['status' => 'active']
        );
    }

    /**
     * Close the chat room if property request status is sale_confirmed or cancelled.
     */
    public function closeRoomIfNeeded(PropertyRequest $request): void
    {
        $statusVal = is_object($request->status) && property_exists($request->status, 'value')
            ? $request->status->value
            : (string) $request->status;

        if (in_array($statusVal, ['sale_confirmed', 'cancelled'], true)) {
            $room = $request->chatRoom;
            if ($room && $room->isActive()) {
                $room->status = 'closed';
                $room->closed_reason = $statusVal;
                $room->save();

                event(new ChatClosed($request->id, $statusVal));
            }
        }
    }
}
