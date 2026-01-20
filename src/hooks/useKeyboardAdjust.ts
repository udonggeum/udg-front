/**
 * 모바일 키보드 대응 훅
 *
 * - 키보드가 올라올 때 입력 필드가 가려지지 않도록 처리
 * - iOS/Android에서 키보드 높이에 맞춰 레이아웃 조정
 * - 웹에서는 영향 없음 (모바일만)
 */

'use client';

import { useEffect, useState } from 'react';

export function useKeyboardAdjust() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    // 서버 사이드 렌더링 환경에서는 실행하지 않음
    if (typeof window === 'undefined') return;

    // iOS Visual Viewport API 사용
    if (window.visualViewport) {
      const handleResize = () => {
        const viewport = window.visualViewport;
        if (!viewport) return;

        const keyboardOpen = viewport.height < window.innerHeight;
        setIsKeyboardVisible(keyboardOpen);

        if (keyboardOpen) {
          const height = window.innerHeight - viewport.height;
          setKeyboardHeight(height);

          // body 높이 조정 (iOS)
          document.body.style.height = `${viewport.height}px`;
        } else {
          setKeyboardHeight(0);
          document.body.style.height = '';
        }
      };

      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);

      return () => {
        window.visualViewport?.removeEventListener('resize', handleResize);
        window.visualViewport?.removeEventListener('scroll', handleResize);
        document.body.style.height = '';
      };
    }

    // Android 폴백 (window resize 이벤트)
    const handleWindowResize = () => {
      const currentHeight = window.innerHeight;
      const screenHeight = window.screen.height;

      // 키보드가 올라오면 innerHeight가 줄어듦
      const keyboardOpen = currentHeight < screenHeight * 0.75;
      setIsKeyboardVisible(keyboardOpen);

      if (keyboardOpen) {
        setKeyboardHeight(screenHeight - currentHeight);
      } else {
        setKeyboardHeight(0);
      }
    };

    window.addEventListener('resize', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  }, []);

  return {
    keyboardHeight,
    isKeyboardVisible,
  };
}

/**
 * 입력 필드 포커스 시 자동으로 화면에 보이도록 스크롤
 */
export function useInputFocusScroll() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement;

      // input, textarea 요소만 처리
      if (
        target.tagName !== 'INPUT' &&
        target.tagName !== 'TEXTAREA' &&
        !target.isContentEditable
      ) {
        return;
      }

      // iOS에서는 약간 지연 후 스크롤 (키보드 애니메이션 완료 후)
      setTimeout(() => {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 300);
    };

    document.addEventListener('focusin', handleFocus);

    return () => {
      document.removeEventListener('focusin', handleFocus);
    };
  }, []);
}
