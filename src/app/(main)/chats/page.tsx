"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuthStore } from "@/stores/useAuthStore";
import { getChatRoomsAction, leaveChatRoomAction } from "@/actions/chat";
import type { ChatRoomWithUnread, ChatRoomType } from "@/types/chat";
import { MessageCircle, User, Store, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { getUserDisplayName, getUserImageUrl } from "@/lib/utils";
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
import { isWebView } from "@/lib/webview";

type ChatFilter = "all" | "STORE" | "received" | "sent";

export default function ChatsPage() {
  const router = useRouter();
  const { user, tokens, isAuthenticated, isLoggingOut } = useAuthStore();
  const [rooms, setRooms] = useState<ChatRoomWithUnread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteRoomId, setDeleteRoomId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<ChatFilter>("all");
  const [inWebView, setInWebView] = useState(false);

  useEffect(() => {
    setInWebView(isWebView());
  }, []);

  const fetchRooms = async () => {
    if (!tokens?.access_token) return;

    setIsLoading(true);
    const result = await getChatRoomsAction(tokens.access_token);

    if (result.success && result.data) {
      setRooms(result.data.rooms);
    } else {
      toast.error(result.error || "메시지 목록을 불러올 수 없습니다.");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if ((!isAuthenticated || !tokens?.access_token) && !isLoggingOut) {
      router.push("/login");
      return;
    }

    if (isAuthenticated && tokens?.access_token) {
      fetchRooms();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, tokens?.access_token, isLoggingOut]);

  const getOtherUser = (room: ChatRoomWithUnread) => {
    if (!user) return null;
    return room.user1_id === user.id ? room.user2 : room.user1;
  };

  // 대화 타입 레이블 가져오기
  const getChatTypeLabel = (type: ChatRoomWithUnread["type"]) => {
    switch (type) {
      case "STORE":
        return "매장 문의";
      case "SELL_GOLD":
        return "금 판매 문의";
      case "BUY_GOLD":
        return "금 구매 문의";
      case "SALE":
        return "금 거래 문의"; // 하위 호환성
      default:
        return "대화";
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
      toast.success("대화방을 나갔습니다.");
      // 목록에서 제거
      setRooms((prev) => prev.filter((room) => room.id !== deleteRoomId));
    } else {
      toast.error(result.error || "대화방 나가기에 실패했습니다.");
    }

    setIsDeleting(false);
    setDeleteRoomId(null);
  };

  // 필터링된 채팅방 목록
  const filteredRooms = rooms.filter((room) => {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "STORE") return room.type === "STORE";

    // 금 거래 문의 (SELL_GOLD, BUY_GOLD, SALE)
    const isGoldTrade = room.type === "SELL_GOLD" || room.type === "BUY_GOLD" || room.type === "SALE";
    if (!isGoldTrade) return false;

    // 받은 문의: 내가 작성한 게시글에 대한 문의
    if (selectedFilter === "received") {
      return room.product?.user_id === user?.id;
    }

    // 보낸 문의: 다른 사람 게시글에 내가 보낸 문의
    if (selectedFilter === "sent") {
      return room.product?.user_id !== user?.id;
    }

    return false;
  });

  // 각 타입별 개수 계산 (useMemo로 최적화)
  const roomCounts = useMemo(() => {
    return {
      all: rooms.length,
      STORE: rooms.filter((r) => r.type === "STORE").length,
      received: rooms.filter((r) => {
        const isGoldTrade = r.type === "SELL_GOLD" || r.type === "BUY_GOLD" || r.type === "SALE";
        return isGoldTrade && r.product?.user_id === user?.id;
      }).length,
      sent: rooms.filter((r) => {
        const isGoldTrade = r.type === "SELL_GOLD" || r.type === "BUY_GOLD" || r.type === "SALE";
        return isGoldTrade && r.product?.user_id !== user?.id;
      }).length,
    };
  }, [rooms, user?.id]); // ✅ useMemo로 메모이제이션

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
    <div className="min-h-screen bg-gray-50">
      <div className={`max-w-4xl mx-auto px-4 ${inWebView ? "py-4" : "py-8"}`}>
        <div className={inWebView ? "mb-4" : "mb-6"}>
          <h1 className={`font-bold text-gray-900 flex items-center gap-2 ${
            inWebView ? "text-xl" : "text-2xl"
          }`}>
            <MessageCircle className={inWebView ? "w-5 h-5" : "w-6 h-6"} />
            메시지
          </h1>
          <p className={`text-gray-600 mt-1 ${inWebView ? "text-xs" : "text-sm"}`}>
            {rooms.length}개의 대화
          </p>
        </div>

      {/* 필터 탭 - 평면 구조 */}
      <div className={`bg-white rounded-xl border border-gray-200 p-1 inline-flex gap-1 flex-wrap ${
        inWebView ? "mb-4" : "mb-6"
      }`}>
        <button
          onClick={() => setSelectedFilter("all")}
          className={`font-semibold rounded-lg transition-all duration-200 ${
            inWebView ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm"
          } ${
            selectedFilter === "all"
              ? "bg-[#C9A227] text-white shadow-md"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          전체
          {roomCounts.all > 0 && (
            <span className={`ml-2 ${selectedFilter === "all" ? "text-white/80" : "text-gray-400"}`}>
              {roomCounts.all}
            </span>
          )}
        </button>
        <button
          onClick={() => setSelectedFilter("STORE")}
          className={`font-semibold rounded-lg transition-all duration-200 flex items-center ${
            inWebView ? "gap-1.5 px-3 py-2 text-xs" : "gap-2 px-4 py-2.5 text-sm"
          } ${
            selectedFilter === "STORE"
              ? "bg-[#C9A227] text-white shadow-md"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <Store className={inWebView ? "w-3.5 h-3.5" : "w-4 h-4"} />
          매장 문의
          {roomCounts.STORE > 0 && (
            <span className={`ml-1 ${selectedFilter === "STORE" ? "text-white/80" : "text-gray-400"}`}>
              {roomCounts.STORE}
            </span>
          )}
        </button>
        <button
          onClick={() => setSelectedFilter("received")}
          className={`font-semibold rounded-lg transition-all duration-200 flex items-center ${
            inWebView ? "gap-1.5 px-3 py-2 text-xs" : "gap-2 px-4 py-2.5 text-sm"
          } ${
            selectedFilter === "received"
              ? "bg-[#C9A227] text-white shadow-md"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <MessageCircle className={inWebView ? "w-3.5 h-3.5" : "w-4 h-4"} />
          받은 문의
          {roomCounts.received > 0 && (
            <span className={`ml-1 ${selectedFilter === "received" ? "text-white/80" : "text-gray-400"}`}>
              {roomCounts.received}
            </span>
          )}
        </button>
        <button
          onClick={() => setSelectedFilter("sent")}
          className={`font-semibold rounded-lg transition-all duration-200 flex items-center ${
            inWebView ? "gap-1.5 px-3 py-2 text-xs" : "gap-2 px-4 py-2.5 text-sm"
          } ${
            selectedFilter === "sent"
              ? "bg-[#C9A227] text-white shadow-md"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <MessageCircle className={inWebView ? "w-3.5 h-3.5" : "w-4 h-4"} />
          보낸 문의
          {roomCounts.sent > 0 && (
            <span className={`ml-1 ${selectedFilter === "sent" ? "text-white/80" : "text-gray-400"}`}>
              {roomCounts.sent}
            </span>
          )}
        </button>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-16">
          <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">아직 메시지 내역이 없습니다.</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="text-center py-16">
          <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">
            {selectedFilter === "STORE" && "매장 문의 대화가 없습니다."}
            {selectedFilter === "received" && "받은 문의가 없습니다."}
            {selectedFilter === "sent" && "보낸 문의가 없습니다."}
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
                className="relative w-full bg-white rounded-lg border border-gray-200 md:hover:border-[#C9A227] md:hover:shadow-md transition-shadow duration-200"
              >
                <button
                  onClick={() => router.push(`/chats/${room.id}`)}
                  className={`w-full text-left ${inWebView ? "p-3" : "p-4"}`}
                >
                  <div className={`flex items-start ${inWebView ? "gap-2" : "gap-3"}`}>
                    {/* Avatar */}
                    <div className={`rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden relative ${
                      inWebView ? "w-10 h-10" : "w-12 h-12"
                    } ${
                      getUserImageUrl(otherUser || {})
                        ? "bg-white border border-gray-200"
                        : "bg-gradient-to-br from-[#C9A227] to-[#8A6A00]"
                    }`}>
                      {getUserImageUrl(otherUser || {}) ? (
                        <Image
                          src={getUserImageUrl(otherUser || {}) || "/default-avatar.png"}
                          alt={getUserDisplayName(otherUser || {})}
                          fill
                          sizes={inWebView ? "40px" : "48px"}
                          className="object-cover"
                          loading="lazy"
                        />
                      ) : room.type === "STORE" ? (
                        <Store className={`text-white ${inWebView ? "w-5 h-5" : "w-6 h-6"}`} />
                      ) : (
                        <User className={`text-white ${inWebView ? "w-5 h-5" : "w-6 h-6"}`} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {getUserDisplayName(otherUser || {})}
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
                          <span className="ml-2 bg-[#C9A227] text-white text-xs font-bold rounded-full px-2 py-0.5 flex-shrink-0">
                            {unreadCount}
                          </span>
                        )}
                      </div>

                      <div className="mt-2">
                        <span className="inline-block text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {getChatTypeLabel(room.type)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 금 거래 게시글 요약 - 당근마켓 스타일 */}
                  {room.type === "SALE" && room.product && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <MessageCircle className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 mb-0.5">문의 상품</p>
                          <p className="text-sm font-semibold text-gray-900 mb-1.5 line-clamp-1">
                            {room.product.title}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {room.product.gold_type && (
                              <span className="inline-flex items-center text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium">
                                {room.product.gold_type}
                              </span>
                            )}
                            {room.product.weight && (
                              <span className="inline-flex items-center text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium">
                                {room.product.weight}g
                              </span>
                            )}
                            {room.product.price && (
                              <span className="inline-flex items-center text-xs bg-[#C9A227] text-white px-2 py-1 rounded font-bold">
                                {room.product.price.toLocaleString()}원
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </button>

                {/* 삭제 버튼 */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleDeleteClick(e, room.id)}
                  className="absolute bottom-4 right-4 text-gray-400 hover:text-red-500 hover:bg-red-50"
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
            <AlertDialogTitle>대화방을 나가시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              대화방 목록에서 숨겨지며, 상대방은 계속 메시지를 보낼 수 있습니다.
              <br />
              <span className="text-gray-600 mt-2 block">
                새 메시지가 오면 대화방이 다시 나타납니다.
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
    </div>
  );
}
