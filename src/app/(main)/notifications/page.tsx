"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import {
  getNotificationsAction,
  markNotificationAsReadAction,
  deleteNotificationAction,
  markAllNotificationsAsReadAction,
} from "@/actions/notifications";
import type { Notification, NotificationType } from "@/types/notification";
import { NOTIFICATION_TYPE_ICONS, NOTIFICATION_TYPE_LABELS } from "@/types/notification";
import { getNotificationLink } from "@/lib/notification-link";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Bell, Trash2 } from "lucide-react";
import { isWebView } from "@/lib/webview";

export default function NotificationsPage() {
  const router = useRouter();
  const { user, tokens } = useAuthStore();
  const { setUnreadCount, markAsRead } = useNotificationStore();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredType, setFilteredType] = useState<NotificationType | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [inWebView, setInWebView] = useState(false);

  const observerTarget = useRef<HTMLDivElement>(null);

  // 웹뷰 감지
  useEffect(() => {
    setInWebView(isWebView());
  }, []);

  // 로그인 확인
  useEffect(() => {
    if (!user || !tokens?.access_token) {
      router.push("/login");
    }
  }, [user, tokens, router]);

  // 알림 목록 조회
  const fetchNotifications = useCallback(
    async (page: number = 1, reset: boolean = false) => {
      if (!tokens?.access_token) return;

      if (reset) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const result = await getNotificationsAction(
          {
            page,
            page_size: 20,
            type: filteredType === "all" ? undefined : filteredType,
          },
          tokens.access_token
        );

        if (result.success && result.data) {
          if (reset) {
            setNotifications(result.data.data);
          } else {
            setNotifications((prev) => [...prev, ...(result.data?.data || [])]);
          }
          setUnreadCount(result.data.unread_count);
          setCurrentPage(page);
          setHasMore((result.data?.data || []).length === 20);
        } else {
          toast.error(result.error || "알림을 불러오는데 실패했습니다.");
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
        toast.error("알림을 불러오는데 실패했습니다.");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [tokens, filteredType, setUnreadCount]
  );

  // 초기 로드
  useEffect(() => {
    if (tokens?.access_token) {
      fetchNotifications(1, true);
    }
  }, [fetchNotifications]);

  // 무한 스크롤
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          fetchNotifications(currentPage + 1);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoadingMore, isLoading, currentPage, fetchNotifications]);

  // 알림 클릭 (읽음 처리 + 링크 이동)
  const handleNotificationClick = async (notification: Notification) => {
    if (!tokens?.access_token) return;

    if (!notification.is_read) {
      const result = await markNotificationAsReadAction(
        notification.id,
        tokens.access_token
      );

      if (result.success) {
        markAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, is_read: true } : n
          )
        );
      }
    }

    // 올바른 링크로 이동
    const correctedLink = getNotificationLink(notification);
    router.push(correctedLink);
  };

  // 알림 삭제
  const handleDelete = async (notificationId: number, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!tokens?.access_token) return;

    const result = await deleteNotificationAction(notificationId, tokens.access_token);

    if (result.success) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      toast.success("알림을 삭제했습니다.");
    } else {
      toast.error(result.error || "알림 삭제에 실패했습니다.");
    }
  };

  // 모두 읽음 처리
  const handleMarkAllAsRead = async () => {
    if (!tokens?.access_token) return;

    const result = await markAllNotificationsAsReadAction(tokens.access_token);

    if (result.success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("모든 알림을 읽음 처리했습니다.");
    } else {
      toast.error(result.error || "읽음 처리에 실패했습니다.");
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (!user || !tokens?.access_token) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`container mx-auto px-4 max-w-[900px] ${inWebView ? "py-4" : "py-8"}`}>
        {/* 헤더 */}
        <div className={inWebView ? "mb-4" : "mb-6"}>
          <h1 className={`font-bold text-gray-900 mb-2 ${inWebView ? "text-xl" : "text-2xl"}`}>알림</h1>
          <p className="text-sm text-gray-600">
            총 {notifications.length}개의 알림
            {unreadCount > 0 && ` · 읽지 않음 ${unreadCount}개`}
          </p>
        </div>

        {/* 필터 & 액션 */}
        <div className={`bg-white rounded-xl border border-gray-200 mb-4 flex items-center justify-between flex-wrap ${inWebView ? "p-3 gap-2" : "p-4 gap-3"}`}>
          {/* 타입 필터 */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setFilteredType("all");
                setCurrentPage(1);
              }}
              className={`text-sm font-medium rounded-lg transition-colors ${inWebView ? "px-3 py-1.5" : "px-4 py-2"} ${
                filteredType === "all"
                  ? "bg-[#C9A227] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              전체
            </button>
            <button
              onClick={() => {
                setFilteredType("new_sell_post");
                setCurrentPage(1);
              }}
              className={`text-sm font-medium rounded-lg transition-colors ${inWebView ? "px-3 py-1.5" : "px-4 py-2"} ${
                filteredType === "new_sell_post"
                  ? "bg-[#C9A227] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {NOTIFICATION_TYPE_ICONS.new_sell_post} 금 판매글
            </button>
            <button
              onClick={() => {
                setFilteredType("post_comment");
                setCurrentPage(1);
              }}
              className={`text-sm font-medium rounded-lg transition-colors ${inWebView ? "px-3 py-1.5" : "px-4 py-2"} ${
                filteredType === "post_comment"
                  ? "bg-[#C9A227] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {NOTIFICATION_TYPE_ICONS.post_comment} 댓글
            </button>
            <button
              onClick={() => {
                setFilteredType("store_liked");
                setCurrentPage(1);
              }}
              className={`text-sm font-medium rounded-lg transition-colors ${inWebView ? "px-3 py-1.5" : "px-4 py-2"} ${
                filteredType === "store_liked"
                  ? "bg-[#C9A227] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {NOTIFICATION_TYPE_ICONS.store_liked} 매장 찜
            </button>
            <button
              onClick={() => {
                setFilteredType("new_chat_message");
                setCurrentPage(1);
              }}
              className={`text-sm font-medium rounded-lg transition-colors ${inWebView ? "px-3 py-1.5" : "px-4 py-2"} ${
                filteredType === "new_chat_message"
                  ? "bg-[#C9A227] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {NOTIFICATION_TYPE_ICONS.new_chat_message} 메시지
            </button>
          </div>

          {/* 모두 읽음 */}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              모두 읽음
            </button>
          )}
        </div>

        {/* 알림 목록 */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mb-4"></div>
              <p className="text-sm text-gray-600">불러오는 중...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                알림이 없습니다
              </h3>
              <p className="text-sm text-gray-500">
                {filteredType === "all"
                  ? "새로운 알림이 도착하면 여기에 표시됩니다."
                  : `${NOTIFICATION_TYPE_LABELS[filteredType]} 알림이 없습니다.`}
              </p>
            </div>
          ) : (
            <>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all cursor-pointer ${
                    !notification.is_read ? "bg-blue-50/30 border-blue-200" : ""
                  } ${inWebView ? "p-3" : "p-5"}`}
                >
                  <div className={`flex items-start ${inWebView ? "gap-3" : "gap-4"}`}>
                    {/* 아이콘 */}
                    <span className={`flex-shrink-0 mt-1 ${inWebView ? "text-xl" : "text-2xl"}`}>
                      {NOTIFICATION_TYPE_ICONS[notification.type]}
                    </span>

                    {/* 내용 */}
                    <div className="flex-1 min-w-0">
                      <div className={`flex items-start justify-between gap-3 ${inWebView ? "mb-1.5" : "mb-2"}`}>
                        <h3
                          className={`font-semibold ${inWebView ? "text-sm" : "text-base"} ${
                            !notification.is_read
                              ? "text-gray-900"
                              : "text-gray-700"
                          }`}
                        >
                          {notification.title}
                        </h3>
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></span>
                        )}
                      </div>
                      <p className={`text-sm text-gray-600 ${inWebView ? "mb-2" : "mb-3"}`}>
                        {notification.content}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: ko,
                          })}
                        </p>
                        <button
                          onClick={(e) => handleDelete(notification.id, e)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* 무한 스크롤 타겟 */}
              {hasMore && (
                <div ref={observerTarget} className="py-8 text-center">
                  {isLoadingMore && (
                    <div className="inline-block w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
