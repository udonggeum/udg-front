import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * 스마트 뒤로가기 훅
 *
 * 브라우저 히스토리가 있으면 이전 페이지로 이동하고,
 * 없으면 지정된 폴백 경로로 이동합니다.
 *
 * @param fallbackPath - 히스토리가 없을 때 이동할 경로 (기본값: '/')
 * @returns 뒤로가기 함수
 */
export function useSmartBack(fallbackPath: string = '/') {
  const router = useRouter();

  const handleBack = useCallback(() => {
    // 히스토리가 있고 같은 도메인에서 왔는지 확인
    if (window.history.length > 1 && document.referrer.includes(window.location.origin)) {
      router.back();
    } else {
      // 히스토리가 없거나 외부에서 온 경우 폴백 경로로 이동
      router.push(fallbackPath);
    }
  }, [router, fallbackPath]);

  return handleBack;
}
