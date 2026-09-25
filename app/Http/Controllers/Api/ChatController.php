<?php

namespace App\Http\Controllers\Api;

use App\Events\MessageSent;
use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use App\Models\PropertyRequest;
use App\Services\ChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ChatController extends Controller
{
    protected ChatService $chatService;

    public function __construct(ChatService $chatService)
    {
        $this->chatService = $chatService;
    }

    private function authorizeAccess(Request $request, PropertyRequest $propRequest, string $ability): void
    {
        $user = $request->user();

        if (!Gate::forUser($user)->allows($ability, $propRequest)) {
            abort(403, 'Unauthorized access to this chat');
        }
    }

    /**
     * Fetch chat room details & message history for a property request.
     */
    public function index(Request $request, int|string $requestId): JsonResponse
    {
        $propRequest = PropertyRequest::findOrFail($requestId);
        $this->authorizeAccess($request, $propRequest, 'view');

        $statusVal = is_object($propRequest->status) && property_exists($propRequest->status, 'value')
            ? $propRequest->status->value
            : (string) $propRequest->status;

        $allowedStatuses = ['schedule_fixed', 'inspection_completed', 'sale_confirmed'];
        if (!in_array($statusVal, $allowedStatuses, true)) {
            return response()->json(['message' => 'Chat not available for this request status'], 403);
        }

        $room = $this->chatService->ensureRoom($propRequest);

        $messages = $room->messages()->with('sender:id,name')->get()->map(function (ChatMessage $msg) {
            return [
                'id'          => $msg->id,
                'message'     => $msg->message,
                'sender_id'   => $msg->sender_id,
                'sender_name' => $msg->sender?->name ?? 'User',
                'is_read'     => (bool) $msg->is_read,
                'created_at'  => $msg->created_at?->toIso8601String(),
            ];
        });

        $roomStatus = is_object($room->status) && property_exists($room->status, 'value')
            ? $room->status->value
            : (string) $room->status;

        $user = $request->user();
        $canSend = Gate::forUser($user)->allows('send', $propRequest) && $room->isActive();

        return response()->json([
            'room' => [
                'id'                  => $room->id,
                'status'              => $roomStatus,
                'property_request_id' => $room->property_request_id,
            ],
            'messages'        => $messages,
            'current_user_id' => $user->id,
            'can_send'        => $canSend,
            'is_admin'        => $user->isAdmin() || $user->role === 'admin',
        ]);
    }

    /**
     * Send a new chat message.
     */
    public function store(Request $request, int|string $requestId): JsonResponse
    {
        $propRequest = PropertyRequest::findOrFail($requestId);
        $this->authorizeAccess($request, $propRequest, 'send');

        $validated = $request->validate([
            'message' => 'required|string|max:5000',
        ]);

        $room = $this->chatService->ensureRoom($propRequest);

        if (!$room->isActive()) {
            return response()->json(['message' => 'Chat room is closed'], 403);
        }

        $cleanMessage = strip_tags($validated['message']);

        $newMessage = ChatMessage::create([
            'chat_room_id' => $room->id,
            'sender_id'    => $request->user()->id,
            'message'      => $cleanMessage,
            'is_read'      => false,
        ]);

        $room->update(['last_message_at' => now()]);

        $newMessage->load('sender', 'chatRoom');

        try {
            broadcast(new MessageSent($newMessage))->toOthers();
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Broadcast message failed: ' . $e->getMessage());
        }

        return response()->json([
            'id'          => $newMessage->id,
            'message'     => $newMessage->message,
            'sender_id'   => $newMessage->sender_id,
            'sender_name' => $newMessage->sender?->name ?? 'User',
            'is_read'     => false,
            'created_at'  => $newMessage->created_at?->toIso8601String(),
        ], 201);
    }

    /**
     * Mark all unread messages from other user as read.
     */
    public function markRead(Request $request, int|string $requestId): JsonResponse
    {
        $propRequest = PropertyRequest::findOrFail($requestId);
        $this->authorizeAccess($request, $propRequest, 'view');

        $room = $this->chatService->ensureRoom($propRequest);

        ChatMessage::where('chat_room_id', $room->id)
            ->where('sender_id', '!=', $request->user()->id)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        return response()->json(['success' => true]);
    }
}
