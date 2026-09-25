<?php

use App\Models\PropertyRequest;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('chat-room.{requestId}', function ($user, $requestId) {
    $request = PropertyRequest::find($requestId);
    if (!$request) {
        return false;
    }

    if ((int) $user->id === (int) $request->buyer_id || (int) $user->id === (int) $request->seller_id) {
        return [
            'id'   => $user->id,
            'name' => $user->name,
        ];
    }

    if ($user->isAdmin() || $user->role === 'admin') {
        return [
            'id'    => $user->id,
            'name'  => $user->name,
            'admin' => true,
        ];
    }

    return false;
});
