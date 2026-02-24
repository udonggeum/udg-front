"use client";

import { useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    // 이미 처리했으면 무시 (중복 호출 방지)
    if (hasProcessedRef.current) {
      return;
    }

    const code = searchParams?.get("code");
    const error = searchParams?.get("error");

    if (error) {
      hasProcessedRef.current = true;
      console.error("Google OAuth error:", error);
      toast.error("구글 로그인이 취소되었습니다.");
      router.push("/login");
      return;
    }

    if (!code) {
      hasProcessedRef.current = true;
      toast.error("인증 코드가 없습니다.");
      router.push("/login");
      return;
    }

    hasProcessedRef.current = true;
    handleGoogleCallback(code);
  }, [searchParams, router]);

  const handleGoogleCallback = async (code: string) => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

      // 백엔드에 authorization code 전달 (GET 방식)
      const response = await fetch(
        `${API_BASE_URL}/api/v1/auth/google/callback?code=${encodeURIComponent(code)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "구글 로그인에 실패했습니다.");
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
      console.error("Google login error:", error);
      toast.error(error instanceof Error ? error.message : "구글 로그인에 실패했습니다.");
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-6">
          {/* 구글 색상의 스피너 */}
          <div className="absolute inset-0 rounded-full border-4 border-gray-100"></div>
          <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">구글 로그인 중</h2>
        <p className="text-sm text-gray-500">잠시만 기다려주세요...</p>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}
