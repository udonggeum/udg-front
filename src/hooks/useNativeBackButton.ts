/**
 * 네이티브 뒤로가기 버튼 처리 훅
 *
 * - 웹에서는 영향 없음
 * - 앱에서만 네이티브 뒤로가기 버튼 처리
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isWebView, onMessageFromNative, postMessageToNative } from '@/lib/webview';

export function useNativeBackButton() {
  const router = useRouter();

  useEffect(() => {
    // 웹 환경에서는 아무것도 하지 않음
    if (!isWebView()) return;

    const handleNativeBack = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'BACK_BUTTON') {
          // 뒤로갈 히스토리가 있으면 뒤로가기
          if (window.history.length > 1) {
            router.back();
          } else {
            // 더 이상 뒤로갈 곳이 없으면 앱 종료 요청
            postMessageToNative('EXIT_APP');
          }
        }
      } catch (error) {
        // JSON 파싱 실패 시 무시
      }
    };

    // 네이티브 메시지 리스너 등록
    const cleanup = onMessageFromNative(handleNativeBack);

    return cleanup;
  }, [router]);
}
