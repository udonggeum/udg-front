"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";

function KakaoCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const code = searchParams?.get("code");
    const error = searchParams?.get("error");
    const errorDescription = searchParams?.get("error_description");

    if (error) {
      console.error("Kakao OAuth error:", error, errorDescription);
      toast.error(errorDescription || "카카오 로그인이 취소되었습니다.");
      router.push("/login");
      return;
    }

    if (!code) {
      toast.error("인증 코드가 없습니다.");
      router.push("/login");
      return;
    }

    handleKakaoCallback(code);
  }, [searchParams]);

  const handleKakaoCallback = async (code: string) => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://43.200.249.22:8080';

      // 백엔드에 authorization code 전달 (GET 방식)
      const response = await fetch(
        `${API_BASE_URL}/api/v1/auth/kakao/callback?code=${encodeURIComponent(code)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "카카오 로그인에 실패했습니다.");
      }

      const data = await response.json();

      // 백엔드에서 받은 사용자 정보와 JWT 토큰 저장
      if (data.user && data.tokens) {
        setAuth(data.user, data.tokens);
        toast.success(`${data.user.name}님, 환영합니다!`);
        router.push("/");
      } else {
        throw new Error("서버 응답 형식이 올바르지 않습니다.");
      }
    } catch (error) {
      console.error("Kakao login error:", error);
      toast.error(error instanceof Error ? error.message : "카카오 로그인에 실패했습니다.");
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-6">
          {/* 카카오 로고 색상의 스피너 */}
          <div className="absolute inset-0 rounded-full border-4 border-[#FEF9E7]"></div>
          <div className="absolute inset-0 rounded-full border-4 border-[#FEE500] border-t-transparent animate-spin"></div>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">카카오 로그인 중</h2>
        <p className="text-sm text-gray-500">잠시만 기다려주세요...</p>
      </div>
    </div>
  );
}

export default function KakaoCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9A227] mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      }
    >
      <KakaoCallbackContent />
    </Suspense>
  );
}
