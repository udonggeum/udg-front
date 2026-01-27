"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import {
  getNotificationsAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
} from "@/actions/notifications";
import { NOTIFICATION_TYPE_ICONS } from "@/types/notification";
import { getNotificationLink } from "@/lib/notification-link";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Bell } from "lucide-react";

export function NotificationDropdown() {
  const router = useRouter();
  const { tokens } = useAuthStore();
  const {
    unreadCount,
    recentNotifications,
    setUnreadCount,
    setRecentNotifications,
    markAsRead,
  } = useNotificationStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // fetchNotifications를 ref로 저장하여 dependency 문제 방지
  const fetchNotificationsRef = useRef(async (showLoading = false) => {
    const currentTokens = useAuthStore.getState().tokens;
    if (!currentTokens?.access_token) return;

    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const result = await getNotificationsAction(
        { page: 1, page_size: 5 },
        currentTokens.access_token
      );

      if (result.success && result.data) {
        setRecentNotifications(result.data.data);
        setUnreadCount(result.data.unread_count);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  });

  // 컴포넌트에서 사용할 fetchNotifications 래퍼
  const fetchNotifications = useCallback((showLoading = false) => {
    return fetchNotificationsRef.current(showLoading);
  }, []);

  // 초기 알림 로드
  useEffect(() => {
    if (tokens?.access_token) {
      fetchNotificationsRef.current(false);
    }
  }, [tokens?.access_token]);

  // 드롭다운 열 때 알림 조회
  useEffect(() => {
    if (isOpen && tokens?.access_token) {
      fetchNotifications(true); // 로딩 표시
    }
  }, [isOpen, tokens?.access_token, fetchNotifications]);

  // 외부 클릭 감지
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (notification: typeof recentNotifications[0]) => {
    if (!tokens?.access_token) return;

    // 읽음 처리
    const result = await markNotificationAsReadAction(
      notification.id,
      tokens.access_token
    );

    if (result.success) {
      markAsRead(notification.id);
    }

    // 올바른 링크로 이동
    setIsOpen(false);
    const correctedLink = getNotificationLink(notification);
    router.push(correctedLink);
  };

  const handleMarkAllAsRead = async () => {
    if (!tokens?.access_token) return;

    const result = await markAllNotificationsAsReadAction(tokens.access_token);

    if (result.success) {
      setUnreadCount(0);
      setRecentNotifications(
        recentNotifications.map((n) => ({ ...n, is_read: true }))
      );
      toast.success("모든 알림을 읽음 처리했습니다.");
    } else {
      toast.error(result.error || "읽음 처리에 실패했습니다.");
    }
  };

  if (!tokens?.access_token) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 알림 아이콘 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-gray-500 hover:text-[#C9A227] hover:bg-gray-50 rounded-lg transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* 드롭다운 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">알림</h3>
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
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
              </div>
            ) : recentNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Bell className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">알림이 없습니다</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentNotifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleMarkAsRead(notification)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                      !notification.is_read ? "bg-gray-50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0 mt-0.5">
                        {NOTIFICATION_TYPE_ICONS[notification.type]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium mb-1 ${
                            !notification.is_read
                              ? "text-gray-900"
                              : "text-gray-600"
                          }`}
                        >
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-1">
                          {notification.content}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: ko,
                          })}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-2"></span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 푸터 */}
          {recentNotifications.length > 0 && (
            <div className="border-t border-gray-100">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="block text-center py-3 text-sm text-gray-600 hover:text-gray-900 font-medium hover:bg-gray-50 transition-colors"
              >
                모든 알림 보기
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
