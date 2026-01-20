import { RefreshCw } from "lucide-react";

interface PullToRefreshIndicatorProps {
  isPulling: boolean;
  pullDistance: number;
  isRefreshing: boolean;
  threshold: number;
}

/**
 * Pull to Refresh 인디케이터
 * 화면 상단에 새로고침 상태를 표시
 */
export function PullToRefreshIndicator({
  isPulling,
  pullDistance,
  isRefreshing,
  threshold,
}: PullToRefreshIndicatorProps) {
  // 표시 여부
  const shouldShow = isPulling || isRefreshing;
  if (!shouldShow) return null;

  // threshold 도달 여부
  const canRefresh = pullDistance >= threshold;

  // 회전 각도 계산 (0 ~ 360도)
  const rotation = isRefreshing
    ? 360 // 새로고침 중: 360도 (무한 회전은 CSS로)
    : Math.min((pullDistance / threshold) * 180, 180); // 당기는 중: 0~180도

  // 투명도 계산 (0 ~ 1)
  const opacity = Math.min(pullDistance / threshold, 1);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none"
      style={{
        transform: `translateY(${isRefreshing ? "60px" : `${Math.min(pullDistance, threshold + 20)}px`})`,
        transition: isRefreshing || !isPulling ? "transform 0.3s ease-out" : "none",
      }}
    >
      <div
        className={`
          flex items-center justify-center
          w-10 h-10 rounded-full
          bg-white shadow-lg border border-gray-200
          ${isRefreshing ? "animate-spin" : ""}
        `}
        style={{
          opacity,
          transform: `rotate(${rotation}deg)`,
          transition: isRefreshing ? "none" : "transform 0.1s ease-out, opacity 0.1s ease-out",
        }}
      >
        <RefreshCw
          className={`w-5 h-5 ${canRefresh ? "text-[#C9A227]" : "text-gray-400"}`}
        />
      </div>

      {/* 텍스트 힌트 (threshold 근처에서만 표시) */}
      {isPulling && !isRefreshing && pullDistance > threshold * 0.6 && (
        <div
          className="absolute top-14 text-xs font-medium text-gray-600 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full"
          style={{
            opacity: Math.min((pullDistance - threshold * 0.6) / (threshold * 0.4), 1),
          }}
        >
          {canRefresh ? "놓아서 새로고침" : "계속 당기세요"}
        </div>
      )}
    </div>
  );
}
