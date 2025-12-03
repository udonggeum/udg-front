"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Header() {
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
          {/* 비로그인 상태 */}
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

          {/* 로그인 상태 (추후 상태관리로 토글) */}
          {/* <Link href="/mypage">
            <Avatar className="w-9 h-9 bg-gradient-to-br from-yellow-400 to-yellow-500">
              <AvatarFallback className="text-white text-[14px] font-bold">
                사
              </AvatarFallback>
            </Avatar>
          </Link> */}
        </div>
      </div>
    </header>
  );
}
