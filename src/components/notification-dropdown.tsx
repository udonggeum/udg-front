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

  // 드롭다운 열 때 알림 조회
  useEffect(() => {
    if (isOpen && tokens?.access_token) {
      fetchNotifications(true); // 로딩 표시
    }
  }, [isOpen, tokens?.access_token, fetchNotifications]);

  // WebSocket 연결 및 실시간 알림 수신
  useEffect(() => {
    if (!tokens?.access_token) return;

    console.log("[알림 WebSocket] 토큰 변경 감지, 연결 초기화");

    // 초기 로드
    fetchNotificationsRef.current(false);

    // WebSocket 연결
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${window.location.host}/api/v1/chats/ws?token=${tokens.access_token}`;

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    let shouldReconnect = true; // 재연결 플래그

    const connect = () => {
      if (!shouldReconnect) return;

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log("[알림 WebSocket] 연결됨");
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("[알림 WebSocket] 메시지 수신:", data);

            // 인증 실패 메시지 감지
            if (data.type === "error" && data.message === "unauthorized") {
              console.log("[알림 WebSocket] 인증 실패, 재연결 중단");
              shouldReconnect = false;
              ws?.close();
              return;
            }

            if (data.type === "new_notification") {
              // 새 알림 수신
              setUnreadCount(data.unread_count);
              // 알림 목록 새로고침 (항상 실행 - 드롭다운 열릴 때 최신 데이터 표시)
              fetchNotificationsRef.current(false);
              // 알림 토스트 표시
              toast.info(data.notification?.title || "새 알림이 도착했습니다");
            } else if (data.type === "unread_count") {
              // 안읽은 개수만 업데이트
              setUnreadCount(data.unread_count);
            }
          } catch (error) {
            console.error("[알림 WebSocket] 메시지 파싱 오류:", error);
          }
        };

        ws.onerror = (error) => {
          console.error("[알림 WebSocket] 오류:", error);
        };

        ws.onclose = (event) => {
          console.log("[알림 WebSocket] 연결 종료, 코드:", event.code);

          // 1008: Policy Violation (인증 실패)
          // 1000: Normal Closure (정상 종료)
          // 1006: Abnormal Closure (비정상 종료)
          if (event.code === 1008 || event.code === 4401) {
            // 인증 실패 - 재연결 중단
            console.log("[알림 WebSocket] 인증 만료, 재연결 중단");
            shouldReconnect = false;
            return;
          }

          // 정상 종료가 아닌 경우에만 재연결
          if (shouldReconnect && event.code !== 1000) {
            console.log("[알림 WebSocket] 5초 후 재연결 시도");
            reconnectTimeout = setTimeout(() => {
              connect();
            }, 5000);
          }
        };
      } catch (error) {
        console.error("[알림 WebSocket] 연결 오류:", error);
        if (shouldReconnect) {
          reconnectTimeout = setTimeout(() => {
            connect();
          }, 5000);
        }
      }
    };

    connect();

    return () => {
      shouldReconnect = false; // cleanup 시 재연결 중단
      if (ws) {
        ws.close(1000); // 정상 종료 코드
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [tokens?.access_token, setUnreadCount]);

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

  const handleMarkAsRead = async (notificationId: number, link: string) => {
    if (!tokens?.access_token) return;

    // 읽음 처리
    const result = await markNotificationAsReadAction(
      notificationId,
      tokens.access_token
    );

    if (result.success) {
      markAsRead(notificationId);
    }

    // 링크로 이동
    setIsOpen(false);
    router.push(link);
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
        className="relative p-2.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
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
                    onClick={() =>
                      handleMarkAsRead(notification.id, notification.link)
                    }
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
