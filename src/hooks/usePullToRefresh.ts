import { useEffect, useRef, useState } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number; // 당겨야 하는 최소 거리 (px)
  resistance?: number; // 당길 때 저항감 (0~1, 낮을수록 부드러움)
  disabled?: boolean;
}

/**
 * Pull to Refresh 훅
 * 모바일에서 화면을 아래로 당기면 새로고침하는 기능
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 0.5,
  disabled = false,
}: UsePullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startY = useRef(0);
  const currentY = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    if (disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      // 스크롤이 최상단일 때만 활성화
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
        isDragging.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || isRefreshing) return;

      currentY.current = e.touches[0].clientY;
      const distance = currentY.current - startY.current;

      // 아래로 당길 때만 (distance > 0)
      if (distance > 0 && window.scrollY === 0) {
        // 저항 적용 (당길수록 느려짐)
        const resistedDistance = distance * resistance;
        setPullDistance(resistedDistance);
        setIsPulling(true);

        // threshold 초과 시 기본 스크롤 방지
        if (resistedDistance > threshold) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!isDragging.current) return;

      isDragging.current = false;

      // threshold 이상 당겼으면 새로고침 실행
      if (pullDistance > threshold && !isRefreshing) {
        setIsRefreshing(true);

        try {
          await onRefresh();
        } catch (error) {
          console.error("Refresh error:", error);
        } finally {
          // 애니메이션을 위해 약간의 지연 후 초기화
          setTimeout(() => {
            setIsRefreshing(false);
            setIsPulling(false);
            setPullDistance(0);
          }, 300);
        }
      } else {
        // threshold 미만이면 취소
        setIsPulling(false);
        setPullDistance(0);
      }
    };

    // 터치 이벤트 등록
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [onRefresh, threshold, resistance, disabled, pullDistance, isRefreshing]);

  return {
    isPulling,
    pullDistance,
    isRefreshing,
    threshold,
  };
}
