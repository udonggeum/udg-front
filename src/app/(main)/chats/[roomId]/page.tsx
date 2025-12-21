"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  getChatRoomAction,
  getMessagesAction,
  sendMessageAction,
  markAsReadAction,
} from "@/actions/chat";
import type { ChatRoom, Message } from "@/types/chat";
import { Send, ArrowLeft, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/hooks/useWebSocket";

export default function ChatRoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = Number(params.roomId);
  const { user, tokens, isAuthenticated } = useAuthStore();

  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // WebSocket connection
  const { isConnected } = useWebSocket({
    url: `ws://43.200.249.22:8080/api/v1/chats/ws`,
    token: tokens?.access_token || "",
    onMessage: (data) => {
      if (data.type === "new_message" && data.message) {
        if (data.message.chat_room_id === roomId) {
          setMessages((prev) => [...prev, data.message!]);
          scrollToBottom();

          // Mark as read if not my message
          if (data.message.sender_id !== user?.id && tokens?.access_token) {
            markAsReadAction(roomId, tokens.access_token);
          }
        }
      }
    },
  });

  useEffect(() => {
    if (!isAuthenticated || !tokens?.access_token) {
      router.push("/login");
      return;
    }

    if (!roomId || isNaN(roomId)) {
      router.push("/chats");
      return;
    }

    fetchRoomData();
  }, [isAuthenticated, tokens, roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const fetchRoomData = async () => {
    if (!tokens?.access_token) return;

    setIsLoading(true);

    // Fetch room details
    const roomResult = await getChatRoomAction(roomId, tokens.access_token);
    if (!roomResult.success || !roomResult.data) {
      toast.error(roomResult.error || "채팅방을 찾을 수 없습니다.");
      router.push("/chats");
      return;
    }
    setRoom(roomResult.data.room);

    // Fetch messages
    const messagesResult = await getMessagesAction(
      roomId,
      tokens.access_token
    );
    if (messagesResult.success && messagesResult.data) {
      setMessages(messagesResult.data.messages.reverse());
    }

    // Mark as read
    await markAsReadAction(roomId, tokens.access_token);

    setIsLoading(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !tokens?.access_token || isSending) return;

    setIsSending(true);

    const result = await sendMessageAction(
      roomId,
      { content: newMessage.trim(), message_type: "TEXT" },
      tokens.access_token
    );

    if (result.success) {
      setNewMessage("");
      scrollToBottom();
    } else {
      toast.error(result.error || "메시지 전송에 실패했습니다.");
    }

    setIsSending(false);
  };

  const getOtherUser = () => {
    if (!room || !user) return null;
    return room.user1_id === user.id ? room.user2 : room.user1;
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded-lg" />
          <div className="h-96 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  const otherUser = getOtherUser();

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 h-[calc(100vh-80px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/chats")}
          className="flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">
              {otherUser?.name || "알 수 없음"}
            </h2>
            <p className="text-xs text-gray-500">
              {room?.type === "STORE" ? "매장 문의" : "판매글 채팅"}
            </p>
          </div>
        </div>

        {isConnected && (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            연결됨
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p>메시지를 입력해 대화를 시작하세요.</p>
          </div>
        ) : (
          messages.map((message) => {
            const isMine = message.sender_id === user?.id;

            return (
              <div
                key={message.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                    isMine
                      ? "bg-yellow-400 text-gray-900"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  <div
                    className={`flex items-center gap-1 mt-1 text-xs ${
                      isMine ? "text-gray-700" : "text-gray-500"
                    }`}
                  >
                    <span>
                      {new Date(message.created_at).toLocaleTimeString(
                        "ko-KR",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </span>
                    {isMine && message.is_read && (
                      <span className="text-blue-600 font-medium">읽음</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSendMessage}
        className="flex items-center gap-2 pt-4 border-t border-gray-200"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="메시지를 입력하세요..."
          className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:border-yellow-400"
          disabled={isSending}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!newMessage.trim() || isSending}
          className="w-12 h-12 rounded-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </Button>
      </form>
    </div>
  );
}
