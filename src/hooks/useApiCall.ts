import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";

/**
 * API 호출 결과를 감시하고 401 에러 시 자동 로그아웃하는 훅
 */
export function useApiErrorHandler() {
  const router = useRouter();
  const { clearAuth } = useAuthStore();
  const hasHandledUnauth = useRef(false);

  const handleApiError = (error: string | undefined) => {
    if (!error) return;

    // 401 관련 에러 메시지 감지
    const unauthorizedMessages = [
      "로그인이 만료",
      "다시 로그인",
      "인증",
      "권한",
      "토큰",
      "unauthorized",
      "authentication",
    ];

    const isUnauthorized = unauthorizedMessages.some((msg) =>
      error.toLowerCase().includes(msg.toLowerCase())
    );

    if (isUnauthorized && !hasHandledUnauth.current) {
      hasHandledUnauth.current = true;

      // 인증 정보 삭제
      clearAuth();

      // 토스트 메시지
      toast.error("로그인이 만료되었습니다. 다시 로그인해주세요.");

      // 로그인 페이지로 이동
      setTimeout(() => {
        router.push("/login");
      }, 1000);
    }
  };

  return { handleApiError };
}
