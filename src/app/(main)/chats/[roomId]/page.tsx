"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { useApiErrorHandler } from "@/hooks/useApiCall";
import {
  getChatRoomAction,
  getMessagesAction,
  sendMessageAction,
  markAsReadAction,
  joinChatRoomAction,
  leaveChatRoomAction,
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
  const { handleApiError } = useApiErrorHandler();

  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // WebSocket connection
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL ||
    (typeof window !== 'undefined' && window.location.protocol === 'https:'
      ? 'wss://udg.co.kr/api/v1/chats/ws'
      : 'ws://43.200.249.22:8080/api/v1/chats/ws');

  const { isConnected, sendMessage } = useWebSocket({
    url: wsUrl,
    token: tokens?.access_token || "",
    onMessage: (data) => {
      if (data.type === "new_message" && data.message) {
        if (data.message.chat_room_id === roomId) {
          // 중복 메시지 방지: 이미 존재하는 메시지는 추가하지 않음
          setMessages((prev) => {
            const messageExists = prev.some((msg) => msg.id === data.message!.id);
            if (messageExists) return prev;

            // 새 메시지를 추가하고 created_at 기준으로 정렬
            const newMessages = [...prev, data.message!];
            return newMessages.sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
          scrollToBottom();

          // Mark as read if not my message
          if (data.message.sender_id !== user?.id && tokens?.access_token) {
            markAsReadAction(roomId, tokens.access_token);
          }
        }
      } else if (data.type === "typing_start" && data.chat_room_id === roomId) {
        // 상대방이 입력 시작
        if (data.user_id !== user?.id) {
          setIsOtherUserTyping(true);
        }
      } else if (data.type === "typing_stop" && data.chat_room_id === roomId) {
        // 상대방이 입력 중지
        if (data.user_id !== user?.id) {
          setIsOtherUserTyping(false);
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

  // Join/Leave chat room for WebSocket
  useEffect(() => {
    if (!tokens?.access_token || !roomId || isNaN(roomId)) return;

    // Join the chat room when entering
    joinChatRoomAction(roomId, tokens.access_token);

    // Leave the chat room when exiting
    return () => {
      if (tokens?.access_token) {
        leaveChatRoomAction(roomId, tokens.access_token);
      }
    };
  }, [roomId, tokens?.access_token]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const fetchRoomData = async () => {
    if (!tokens?.access_token) return;

    setIsLoading(true);

    // Fetch room details
    const roomResult = await getChatRoomAction(roomId, tokens.access_token);
    if (!roomResult.success || !roomResult.data) {
      handleApiError(roomResult.error);
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
      // created_at 기준으로 오래된 메시지부터 최신 메시지 순으로 정렬
      const sortedMessages = messagesResult.data.messages.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setMessages(sortedMessages);
    }

    // Mark as read
    await markAsReadAction(roomId, tokens.access_token);

    setIsLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    // Send typing_start event
    if (value.length === 1) {
      sendMessage({
        type: "typing_start",
        chat_room_id: roomId,
      });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing_stop after 2 seconds of inactivity
    if (value.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        sendMessage({
          type: "typing_stop",
          chat_room_id: roomId,
        });
      }, 2000);
    } else {
      // If input is empty, send typing_stop immediately
      sendMessage({
        type: "typing_stop",
        chat_room_id: roomId,
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !tokens?.access_token || isSending) return;

    // Stop typing indicator
    sendMessage({
      type: "typing_stop",
      chat_room_id: roomId,
    });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setIsSending(true);

    const result = await sendMessageAction(
      roomId,
      { content: newMessage.trim(), message_type: "TEXT" },
      tokens.access_token
    );

    if (result.success && result.data?.message) {
      // 전송 성공 시 즉시 메시지를 화면에 표시 (낙관적 UI 업데이트)
      setMessages((prev) => {
        const messageExists = prev.some((msg) => msg.id === result.data!.message.id);
        if (messageExists) return prev;

        // 새 메시지를 추가하고 created_at 기준으로 정렬
        const newMessages = [...prev, result.data!.message];
        return newMessages.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
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

  // 사용자 표시명 가져오기 (admin이고 매장명이 있으면 매장명, 아니면 이름)
  const getDisplayName = (chatUser: ChatRoom["user1"] | null) => {
    if (!chatUser) return "알 수 없음";
    if (chatUser.role === "admin" && chatUser.store_name) {
      return chatUser.store_name;
    }
    return chatUser.name;
  };

  // 채팅 타입 레이블 가져오기
  const getChatTypeLabel = (type: ChatRoom["type"]) => {
    switch (type) {
      case "STORE":
        return "매장 문의";
      case "GOLD_TRADE":
        return "금 거래";
      case "PERSONAL":
        return "개인 채팅";
      default:
        return "채팅";
    }
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
              {getDisplayName(otherUser)}
            </h2>
            <p className="text-xs text-gray-500">
              {room && getChatTypeLabel(room.type)}
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
          <>
            {messages.map((message) => {
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
          })}
          {isOtherUserTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          </>
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
          onChange={handleInputChange}
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
