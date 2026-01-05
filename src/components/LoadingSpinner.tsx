import React, { memo } from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

/**
 * Accessible Loading Spinner Component
 *
 * ARIA attributes:
 * - role="status": 스크린 리더에 상태 업데이트 알림
 * - aria-live="polite": 변경사항을 예의있게 알림
 * - aria-busy="true": 로딩 중임을 표시
 * - aria-label: 스크린 리더용 레이블
 */
function LoadingSpinnerComponent({ size = "md", text, className = "" }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-4",
    lg: "w-12 h-12 border-4",
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={text || "로딩 중"}
      className={`flex flex-col items-center justify-center gap-2 ${className}`}
    >
      <div
        className={`${sizeClasses[size]} border-gray-200 border-t-gray-900 rounded-full animate-spin`}
        aria-hidden="true"
      />
      {text && (
        <span className={`${textSizeClasses[size]} text-gray-600`}>
          {text}
        </span>
      )}
      {/* 스크린 리더 전용 텍스트 */}
      <span className="sr-only">{text || "로딩 중입니다"}</span>
    </div>
  );
}

export const LoadingSpinner = memo(LoadingSpinnerComponent);

/**
 * Full Page Loading Spinner
 * 전체 화면을 차지하는 로딩 스피너
 */
export function FullPageLoading({ text = "페이지를 불러오는 중..." }: { text?: string }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

/**
 * Inline Loading Spinner
 * 인라인에서 사용하는 작은 로딩 스피너
 */
export function InlineLoading({ text }: { text?: string }) {
  return (
    <div className="inline-flex items-center gap-2">
      <LoadingSpinner size="sm" text={text} />
    </div>
  );
}
