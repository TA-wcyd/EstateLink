<?php

namespace App\Policies;

use App\Models\PropertyRequest;
use App\Models\User;

class ChatRoomPolicy
{
    /**
     * Determine whether the user can view the chat room & messages.
     */
    public function view(User $user, PropertyRequest $request): bool
    {
        if ($user->isAdmin() || $user->role === 'admin') {
            return true;
        }

        return (int) $user->id === (int) $request->buyer_id || (int) $user->id === (int) $request->seller_id;
    }

    /**
     * Determine whether the user can send messages in the chat room.
     */
    public function send(User $user, PropertyRequest $request): bool
    {
        return (int) $user->id === (int) $request->buyer_id || (int) $user->id === (int) $request->seller_id;
    }
}
