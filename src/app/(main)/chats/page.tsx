"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { getChatRoomsAction } from "@/actions/chat";
import type { ChatRoomWithUnread } from "@/types/chat";
import { MessageCircle, User, Store } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

export default function ChatsPage() {
  const router = useRouter();
  const { user, tokens, isAuthenticated } = useAuthStore();
  const [rooms, setRooms] = useState<ChatRoomWithUnread[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !tokens?.access_token) {
      router.push("/login");
      return;
    }

    fetchRooms();
  }, [isAuthenticated, tokens]);

  const fetchRooms = async () => {
    if (!tokens?.access_token) return;

    setIsLoading(true);
    const result = await getChatRoomsAction(tokens.access_token);

    if (result.success && result.data) {
      setRooms(result.data.rooms);
    } else {
      toast.error(result.error || "채팅방 목록을 불러올 수 없습니다.");
    }
    setIsLoading(false);
  };

  const getOtherUser = (room: ChatRoomWithUnread) => {
    if (!user) return null;
    return room.user1_id === user.id ? room.user2 : room.user1;
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return "";
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: ko,
      });
    } catch {
      return "";
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MessageCircle className="w-6 h-6" />
          채팅
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          {rooms.length}개의 대화
        </p>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-16">
          <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">아직 채팅 내역이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => {
            const otherUser = getOtherUser(room);
            const unreadCount =
              user?.id === room.user1_id
                ? room.user1_unread_count
                : room.user2_unread_count;

            return (
              <button
                key={room.id}
                onClick={() => router.push(`/chats/${room.id}`)}
                className="w-full text-left bg-white rounded-lg border border-gray-200 p-4 hover:border-yellow-400 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center flex-shrink-0">
                    {room.type === "STORE" ? (
                      <Store className="w-6 h-6 text-white" />
                    ) : (
                      <User className="w-6 h-6 text-white" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {otherUser?.name || "알 수 없음"}
                      </h3>
                      {room.last_message_at && (
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {formatTime(room.last_message_at)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 truncate flex-1">
                        {room.last_message_content || "메시지 없음"}
                      </p>
                      {unreadCount > 0 && (
                        <span className="ml-2 bg-yellow-400 text-white text-xs font-bold rounded-full px-2 py-0.5 flex-shrink-0">
                          {unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {room.type === "STORE" ? "매장 문의" : "판매글 채팅"}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
