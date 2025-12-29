"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { getChatRoomsAction, leaveChatRoomAction } from "@/actions/chat";
import { useApiErrorHandler } from "@/hooks/useApiCall";
import type { ChatRoomWithUnread, ChatRoomType } from "@/types/chat";
import { MessageCircle, User, Store, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type ChatFilter = "all" | "STORE" | "GOLD_TRADE";

export default function ChatsPage() {
  const router = useRouter();
  const { user, tokens, isAuthenticated } = useAuthStore();
  const { handleApiError } = useApiErrorHandler();
  const [rooms, setRooms] = useState<ChatRoomWithUnread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteRoomId, setDeleteRoomId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<ChatFilter>("all");

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
      // 401 에러 체크 및 자동 로그아웃
      handleApiError(result.error);
      toast.error(result.error || "채팅방 목록을 불러올 수 없습니다.");
    }
    setIsLoading(false);
  };

  const getOtherUser = (room: ChatRoomWithUnread) => {
    if (!user) return null;
    return room.user1_id === user.id ? room.user2 : room.user1;
  };

  // 사용자 표시명 가져오기 (admin이고 매장명이 있으면 매장명, 아니면 이름)
  const getDisplayName = (chatUser: ChatRoomWithUnread["user1"] | null) => {
    if (!chatUser) return "알 수 없음";
    if (chatUser.role === "admin" && chatUser.store_name) {
      return chatUser.store_name;
    }
    return chatUser.name;
  };

  // 채팅 타입 레이블 가져오기
  const getChatTypeLabel = (type: ChatRoomWithUnread["type"]) => {
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

  const handleDeleteClick = (e: React.MouseEvent, roomId: number) => {
    e.stopPropagation();
    setDeleteRoomId(roomId);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteRoomId || !tokens?.access_token) return;

    setIsDeleting(true);
    const result = await leaveChatRoomAction(deleteRoomId, tokens.access_token);

    if (result.success) {
      toast.success("채팅방을 나갔습니다.");
      // 목록에서 제거
      setRooms((prev) => prev.filter((room) => room.id !== deleteRoomId));
    } else {
      // 401 에러 체크 및 자동 로그아웃
      handleApiError(result.error);
      toast.error(result.error || "채팅방 나가기에 실패했습니다.");
    }

    setIsDeleting(false);
    setDeleteRoomId(null);
  };

  // 필터링된 채팅방 목록
  const filteredRooms = rooms.filter((room) => {
    if (selectedFilter === "all") return true;
    return room.type === selectedFilter;
  });

  // 각 타입별 개수 계산
  const roomCounts = {
    all: rooms.length,
    STORE: rooms.filter((r) => r.type === "STORE").length,
    GOLD_TRADE: rooms.filter((r) => r.type === "GOLD_TRADE").length,
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

      {/* 필터 탭 */}
      <div className="mb-6 bg-white rounded-xl border border-gray-200 p-1 inline-flex gap-1">
        <button
          onClick={() => setSelectedFilter("all")}
          className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
            selectedFilter === "all"
              ? "bg-gray-900 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          전체
          {roomCounts.all > 0 && (
            <span className={`ml-2 ${selectedFilter === "all" ? "text-gray-300" : "text-gray-400"}`}>
              {roomCounts.all}
            </span>
          )}
        </button>
        <button
          onClick={() => setSelectedFilter("STORE")}
          className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 ${
            selectedFilter === "STORE"
              ? "bg-gray-900 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <Store className="w-4 h-4" />
          매장 문의
          {roomCounts.STORE > 0 && (
            <span className={`ml-1 ${selectedFilter === "STORE" ? "text-gray-300" : "text-gray-400"}`}>
              {roomCounts.STORE}
            </span>
          )}
        </button>
        <button
          onClick={() => setSelectedFilter("GOLD_TRADE")}
          className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 ${
            selectedFilter === "GOLD_TRADE"
              ? "bg-gray-900 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          금거래 문의
          {roomCounts.GOLD_TRADE > 0 && (
            <span className={`ml-1 ${selectedFilter === "GOLD_TRADE" ? "text-gray-300" : "text-gray-400"}`}>
              {roomCounts.GOLD_TRADE}
            </span>
          )}
        </button>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-16">
          <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">아직 채팅 내역이 없습니다.</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="text-center py-16">
          <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">
            {selectedFilter === "STORE" && "매장 문의 채팅이 없습니다."}
            {selectedFilter === "GOLD_TRADE" && "금거래 문의 채팅이 없습니다."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRooms.map((room) => {
            const otherUser = getOtherUser(room);
            const unreadCount =
              user?.id === room.user1_id
                ? room.user1_unread_count
                : room.user2_unread_count;

            return (
              <div
                key={room.id}
                className="relative w-full bg-white rounded-lg border border-gray-200 md:hover:border-yellow-400 md:hover:shadow-md transition-shadow duration-200"
              >
                <button
                  onClick={() => router.push(`/chats/${room.id}`)}
                  className="w-full text-left p-4"
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
                          {getDisplayName(otherUser)}
                        </h3>
                        {room.last_message_at && (
                          <span className="text-xs text-gray-600 flex-shrink-0 ml-2">
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
                        <span className="text-xs text-gray-600">
                          {getChatTypeLabel(room.type)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* 삭제 버튼 */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleDeleteClick(e, room.id)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteRoomId !== null} onOpenChange={(open: boolean) => !open && setDeleteRoomId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>채팅방을 나가시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              채팅방 목록에서 숨겨지며, 상대방은 계속 메시지를 보낼 수 있습니다.
              <br />
              <span className="text-gray-600 mt-2 block">
                새 메시지가 오면 채팅방이 다시 나타납니다.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "나가는 중..." : "나가기"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
