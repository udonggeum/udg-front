"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import { logoutUserAction } from "@/actions/auth";
import { toast } from "sonner";
import { User, Settings, LogOut, ChevronDown } from "lucide-react";

export function Header() {
  const router = useRouter();
  const { isAuthenticated, user, tokens, clearAuth } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
      <div className="max-w-[1200px] mx-auto px-5 h-[60px] flex justify-between items-center">
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
            href="/price"
            className="nav-link text-[15px] font-medium text-gray-600 hover:text-gray-900 smooth-transition"
          >
            금시세
          </Link>
          <Link
            href="/stores"
            className="nav-link text-[15px] font-medium text-gray-600 hover:text-gray-900 smooth-transition"
          >
            매장찾기
          </Link>
          <Link
            href="/community"
            className="nav-link text-[15px] font-medium text-gray-600 hover:text-gray-900 smooth-transition"
          >
            커뮤니티
          </Link>
        </nav>

        {/* 우측 영역 */}
        <div className="flex items-center gap-3">
          {!isAuthenticated ? (
            // 비로그인 상태
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button
                  variant="ghost"
                  className="hidden md:block text-[14px] font-semibold text-gray-700 hover:bg-gray-100"
                >
                  로그인
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="px-4 py-2.5 text-[14px] font-semibold text-white bg-gray-900 hover:bg-gray-800">
                  시작하기
                </Button>
              </Link>
            </div>
          ) : (
            // 로그인 상태 - 드롭다운 메뉴
            <div className="relative">
              <Button
                variant="ghost"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 text-[14px] font-semibold text-gray-700 hover:bg-gray-100"
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
                    </div>

                    {/* 마이페이지 */}
                    <Link
                      href="/mypage"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-[14px] text-gray-700 hover:bg-gray-50 smooth-transition"
                    >
                      <User className="w-4 h-4" />
                      마이페이지
                    </Link>

                    {/* 프로필 수정 */}
                    <Link
                      href="/mypage/edit"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-[14px] text-gray-700 hover:bg-gray-50 smooth-transition"
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
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-[14px] text-red-600 hover:bg-gray-50 smooth-transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <LogOut className="w-4 h-4" />
                      {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
