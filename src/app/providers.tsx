"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState, useEffect } from "react";
import { setupWebViewClass } from "@/lib/webview";
import { useInputFocusScroll } from "@/hooks/useKeyboardAdjust";

export function Providers({ children }: { children: ReactNode }) {
  // useState를 사용하여 QueryClient를 한 번만 생성
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 5분간 데이터를 신선한 것으로 간주 (재요청 안 함)
            staleTime: 5 * 60 * 1000,
            // 10분간 캐시 유지 (가비지 컬렉션 방지)
            gcTime: 10 * 60 * 1000,
            // 윈도우 포커스 시 자동 재검증 비활성화 (선택적)
            refetchOnWindowFocus: false,
            // 네트워크 재연결 시 자동 재검증
            refetchOnReconnect: true,
            // 에러 발생 시 재시도 (기본값: 3회)
            retry: 1,
          },
        },
      })
  );

  // 웹뷰 환경 초기화
  useEffect(() => {
    setupWebViewClass();
  }, []);

  // 키보드 포커스 스크롤 처리 (모바일 전용)
  useInputFocusScroll();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
