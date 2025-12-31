"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import { useLocationStore } from "@/stores/useLocationStore";
import { useApiErrorHandler } from "@/hooks/useApiCall";
import { logoutUserAction } from "@/actions/auth";
import { getChatRoomsAction } from "@/actions/chat";
import { getMyStoreAction } from "@/actions/stores";
import { useWebSocket } from "@/hooks/useWebSocket";
import { toast } from "sonner";
import { User, Settings, LogOut, ChevronDown, MapPin, Menu, X } from "lucide-react";
import LocationSettingModal from "@/components/LocationSettingModal";
import { NotificationDropdown } from "@/components/notification-dropdown";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function Header() {
  const router = useRouter();
  const { isAuthenticated, user, tokens, clearAuth } = useAuthStore();
  const { currentLocation, initializeFromUserAddress } = useLocationStore();
  const { handleApiError } = useApiErrorHandler();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [myStoreId, setMyStoreId] = useState<number | null>(null);

  // user.address로 초기화 (currentLocation이 없을 때만)
  useEffect(() => {
    if (user?.address && !currentLocation) {
      initializeFromUserAddress(user.address);
    }
  }, [user?.address, currentLocation, initializeFromUserAddress]);

  // 안읽은 메시지 개수 가져오기
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated || !tokens?.access_token) {
      setUnreadChatCount(0);
      return;
    }

    try {
      const result = await getChatRoomsAction(tokens.access_token);
      if (result.success && result.data) {
        // 모든 방의 unread_count 합산
        const totalUnread = result.data.rooms.reduce((sum, room) => {
          return sum + room.unread_count;
        }, 0);
        setUnreadChatCount(totalUnread);
      } else {
        // 401 에러 체크 및 자동 로그아웃
        handleApiError(result.error);
      }
    } catch (error) {
      console.error("Failed to fetch unread chat count:", error);
    }
  }, [isAuthenticated, tokens, handleApiError]);

  // WebSocket 메시지 핸들러 (안정화된 콜백)
  const handleWebSocketMessage = useCallback((data: any) => {
    // 새 메시지가 왔을 때 (내가 보낸 메시지가 아닌 경우)
    if (data.type === "new_message" && data.message) {
      if (data.message.sender_id !== user?.id) {
        // 실시간으로 안읽은 개수 증가
        setUnreadChatCount((prev) => prev + 1);
      }
    }
    // 메시지를 읽었을 때는 정확한 개수를 다시 가져오기
    if (data.type === "read") {
      fetchUnreadCount();
    }
  }, [user?.id, fetchUnreadCount]);

  // 초기 로드
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // admin 사용자의 매장 ID 가져오기
  useEffect(() => {
    const fetchMyStoreId = async () => {
      if (user?.role !== "admin" || !tokens?.access_token) {
        setMyStoreId(null);
        return;
      }

      try {
        const result = await getMyStoreAction(tokens.access_token);
        if (result.success && result.data?.store) {
          setMyStoreId(result.data.store.id);
        } else {
          console.error("Failed to fetch my store ID:", result.error);
        }
      } catch (error) {
        console.error("Failed to fetch my store ID:", error);
      }
    };

    if (user?.role === "admin" && tokens?.access_token) {
      fetchMyStoreId();
    }
  }, [user?.role, tokens?.access_token]);

  // WebSocket으로 실시간 메시지 수신
  useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/api/v1/chats/ws',
    token: tokens?.access_token || "",
    onMessage: handleWebSocketMessage,
  });

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setIsDropdownOpen(false);

    try {
      // 서버에 로그아웃 요청 (refresh token 무효화)
      if (tokens?.refresh_token) {
        const result = await logoutUserAction(tokens.refresh_token);

        if (!result.success) {
          console.warn("로그아웃 API 호출 실패:", result.error);
          // API 실패해도 클라이언트 측 정리는 진행
        }
      }

      // 클라이언트 측 인증 상태 정리
      clearAuth();
      toast.success("로그아웃되었습니다.");
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
      // 에러가 발생해도 클라이언트 측 정리는 진행
      clearAuth();
      toast.success("로그아웃되었습니다.");
      router.push("/");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="w-full bg-white sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-[1200px] mx-auto px-page h-[60px] flex justify-between items-center">
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
          </div>
          <span className="text-lg font-bold text-gray-900">우리동네금은방</span>
        </Link>

        {/* 네비게이션 */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="/prices"
            className="nav-link text-body font-medium text-gray-600 hover:text-gray-900 smooth-transition"
          >
            금시세
          </Link>
          <Link
            href="/stores"
            className="nav-link text-body font-medium text-gray-600 hover:text-gray-900 smooth-transition"
          >
            매장찾기
          </Link>
          <Link
            href="/community"
            className="nav-link text-body font-medium text-gray-600 hover:text-gray-900 smooth-transition"
          >
            금광산
          </Link>
          {isAuthenticated && (
            <Link
              href="/chats"
              className="nav-link text-body font-medium text-gray-600 hover:text-gray-900 smooth-transition relative"
            >
              메시지
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-3 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {unreadChatCount > 99 ? "99+" : unreadChatCount}
                </span>
              )}
            </Link>
          )}
        </nav>

        {/* 우측 영역 */}
        <div className="flex items-center gap-3">
          {/* 모바일 햄버거 메뉴 버튼 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-gray-700"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>

          {!isAuthenticated ? (
            // 비로그인 상태
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button
                  variant="ghost"
                  className="hidden md:block text-caption font-semibold text-gray-700 hover:bg-gray-100"
                >
                  로그인
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="px-4 py-2.5 text-caption font-semibold text-white bg-gray-900 hover:bg-gray-800">
                  시작하기
                </Button>
              </Link>
            </div>
          ) : (
            // 로그인 상태 - 위치 버튼 + 드롭다운 메뉴
            <div className="flex items-center gap-1">
              {/* 위치 설정 버튼 */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsLocationModalOpen(true)}
                      className="text-gray-500 hover:text-blue-600 hover:bg-gray-100"
                    >
                      <MapPin className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{currentLocation || "위치 설정"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* 알림 아이콘 (Admin 전용) */}
              {user?.role === "admin" && <NotificationDropdown />}

              {/* 사용자 드롭다운 메뉴 */}
              <div className="relative">
                <Button
                  variant="ghost"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 text-caption font-semibold text-gray-700 hover:bg-gray-100"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">{user?.name || "사용자"}</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>

                {isDropdownOpen && (
                <>
                  {/* 배경 오버레이 */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsDropdownOpen(false)}
                  />

                  {/* 드롭다운 메뉴 */}
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                    {/* 사용자 정보 */}
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      {user?.role === "admin" && (
                        <p className="text-xs text-yellow-600 font-semibold mt-0.5">관리자</p>
                      )}
                    </div>

                    {/* 마이페이지 */}
                    <Link
                      href="/mypage"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-caption text-gray-700 hover:bg-gray-50 smooth-transition"
                    >
                      <User className="w-4 h-4" />
                      마이페이지
                    </Link>

                    {/* Admin 전용: 내 매장 정보 */}
                    {user?.role === "admin" && myStoreId && (
                      <Link
                        href={`/stores/${myStoreId}`}
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-caption text-gray-700 hover:bg-gray-50 smooth-transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        내 매장 정보
                      </Link>
                    )}

                    {/* 프로필 수정 */}
                    <Link
                      href="/mypage/edit"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-caption text-gray-700 hover:bg-gray-50 smooth-transition"
                    >
                      <Settings className="w-4 h-4" />
                      프로필 수정
                    </Link>

                    {/* 구분선 */}
                    <div className="border-t border-gray-100 my-1" />

                    {/* 로그아웃 */}
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-caption text-red-600 hover:bg-gray-50 smooth-transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <LogOut className="w-4 h-4" />
                      {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
                    </button>
                  </div>
                </>
              )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 모바일 메뉴 */}
      {isMobileMenuOpen && (
        <>
          {/* 배경 오버레이 */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* 슬라이드 메뉴 */}
          <div className="fixed top-[60px] left-0 right-0 bg-white border-b border-gray-200 z-50 md:hidden animate-in slide-in-from-top duration-200">
            <nav className="px-page py-4 space-y-1">
              <Link
                href="/prices"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-3.5 text-body font-medium text-gray-700 hover:bg-gray-50 rounded-lg active:bg-gray-100 transition-colors"
              >
                금시세
              </Link>
              <Link
                href="/stores"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-3.5 text-body font-medium text-gray-700 hover:bg-gray-50 rounded-lg active:bg-gray-100 transition-colors"
              >
                매장찾기
              </Link>
              <Link
                href="/community"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-3.5 text-body font-medium text-gray-700 hover:bg-gray-50 rounded-lg active:bg-gray-100 transition-colors"
              >
                금광산
              </Link>
              {isAuthenticated && (
                <Link
                  href="/chats"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-3.5 text-body font-medium text-gray-700 hover:bg-gray-50 rounded-lg active:bg-gray-100 transition-colors relative"
                >
                  <div className="flex items-center justify-between">
                    <span>채팅</span>
                    {unreadChatCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {unreadChatCount > 99 ? "99+" : unreadChatCount}
                      </span>
                    )}
                  </div>
                </Link>
              )}

              {!isAuthenticated && (
                <>
                  <div className="border-t border-gray-100 my-2" />
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-3.5 text-body font-medium text-gray-700 hover:bg-gray-50 rounded-lg active:bg-gray-100 transition-colors"
                  >
                    로그인
                  </Link>
                </>
              )}
            </nav>
          </div>
        </>
      )}

      {/* 위치 설정 모달 */}
      <LocationSettingModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />
    </header>
  );
}
