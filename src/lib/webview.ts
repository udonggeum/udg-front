/**
 * 웹뷰 감지 및 네이티브 앱과의 통신을 위한 유틸리티
 *
 * - 기존 웹 환경에서는 아무 영향 없음
 * - 앱 웹뷰에서만 특별한 기능 활성화
 */

// 웹뷰 타입 정의
export type WebViewType = 'ios' | 'android' | 'web';

// 네이티브 브릿지 인터페이스
declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
    webkit?: {
      messageHandlers?: {
        reactNative?: {
          postMessage: (message: any) => void;
        };
      };
    };
  }
}

/**
 * 현재 환경이 웹뷰인지 감지
 */
export function isWebView(): boolean {
  if (typeof window === 'undefined') return false;

  const ua = navigator.userAgent || navigator.vendor;

  // React Native WebView 감지
  if (window.ReactNativeWebView) return true;

  // iOS WebKit 메시지 핸들러 감지
  if (window.webkit?.messageHandlers?.reactNative) return true;

  // User Agent 기반 감지
  if (ua.includes('wv') || ua.includes('WebView')) return true;

  return false;
}

/**
 * 웹뷰 타입 확인
 */
export function getWebViewType(): WebViewType {
  if (typeof window === 'undefined') return 'web';

  if (!isWebView()) return 'web';

  const ua = navigator.userAgent || navigator.vendor;

  if (/iPad|iPhone|iPod/.test(ua) || window.webkit?.messageHandlers?.reactNative) {
    return 'ios';
  }

  if (/android/i.test(ua)) {
    return 'android';
  }

  return 'web';
}

/**
 * 네이티브 앱으로 메시지 전송
 */
export function postMessageToNative(type: string, data?: any): void {
  if (!isWebView()) {
    console.warn('[WebView] Not in webview environment');
    return;
  }

  const message = JSON.stringify({ type, data });

  try {
    // React Native WebView
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(message);
      return;
    }

    // iOS WebKit
    if (window.webkit?.messageHandlers?.reactNative) {
      window.webkit.messageHandlers.reactNative.postMessage({ type, data });
      return;
    }

    console.warn('[WebView] No native bridge found');
  } catch (error) {
    console.error('[WebView] Failed to post message:', error);
  }
}

/**
 * 네이티브 앱으로부터 메시지 수신
 */
export function onMessageFromNative(callback: (event: MessageEvent) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener('message', callback);

  // cleanup 함수 반환
  return () => {
    window.removeEventListener('message', callback);
  };
}

/**
 * 앱뷰 전용 클래스 추가 (CSS 분기용)
 */
export function setupWebViewClass(): void {
  if (typeof window === 'undefined') return;

  if (isWebView()) {
    document.documentElement.classList.add('is-webview');
    const type = getWebViewType();
    document.documentElement.classList.add(`is-webview-${type}`);
  }
}

/**
 * Safe Area Inset 값 가져오기
 */
export function getSafeAreaInsets() {
  if (typeof window === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  const computedStyle = getComputedStyle(document.documentElement);

  return {
    top: parseInt(computedStyle.getPropertyValue('--safe-area-inset-top') || '0'),
    bottom: parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0'),
    left: parseInt(computedStyle.getPropertyValue('--safe-area-inset-left') || '0'),
    right: parseInt(computedStyle.getPropertyValue('--safe-area-inset-right') || '0'),
  };
}

// 앱뷰 전용 이벤트 타입
export type NativeEventType =
  | 'BACK_BUTTON'        // 뒤로가기 버튼
  | 'APP_STATE_CHANGE'   // 앱 상태 변경 (background/active)
  | 'IMAGE_SELECTED'     // 이미지 선택 완료
  | 'KEYBOARD_SHOW'      // 키보드 표시
  | 'KEYBOARD_HIDE'      // 키보드 숨김
  | 'DEEP_LINK';         // 딥링크 진입

// 네이티브로 전송할 메시지 타입
export type NativeMessageType =
  | 'EXIT_APP'           // 앱 종료
  | 'PICK_IMAGE'         // 이미지 선택
  | 'SHARE'              // 공유하기
  | 'OPEN_EXTERNAL'      // 외부 브라우저 열기
  | 'HAPTIC_FEEDBACK'    // 햅틱 피드백
  | 'SET_STATUS_BAR';    // 상태바 설정
