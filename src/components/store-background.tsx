"use client";

import { ReactNode, useMemo } from "react";
import type { StoreBackground as StoreBackgroundType } from "@/types/stores";
import {
  getColorById,
  getPresetById,
  DEFAULT_BACKGROUND,
} from "@/constants/store-backgrounds";

interface StoreBackgroundProps {
  background?: StoreBackgroundType;
  className?: string;
  children?: ReactNode;
}

/**
 * 패턴 SVG 렌더링
 */
function PatternSVG({ pattern, isDark }: { pattern: string; isDark: boolean }) {
  const fillColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";

  switch (pattern) {
    case "dots":
      return (
        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="dots-pattern" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="5" cy="5" r="1" fill={fillColor} />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#dots-pattern)" />
        </svg>
      );

    case "grid":
      return (
        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="grid-pattern" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke={fillColor} strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid-pattern)" />
        </svg>
      );

    case "waves":
      return (
        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="waves-pattern" width="20" height="10" patternUnits="userSpaceOnUse">
              <path
                d="M0 5 Q5 0 10 5 T20 5"
                fill="none"
                stroke={fillColor}
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#waves-pattern)" />
        </svg>
      );

    case "diagonal":
      return (
        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="diagonal-pattern" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M0 10 L10 0" fill="none" stroke={fillColor} strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#diagonal-pattern)" />
        </svg>
      );

    default:
      return null;
  }
}

/**
 * 색상이 어두운지 판별
 */
function isDarkColor(hex: string): boolean {
  const color = hex.replace("#", "");
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

/**
 * 매장 배경 컴포넌트
 */
export function StoreBackground({ background, className = "", children }: StoreBackgroundProps) {
  const { gradientStyle, pattern, isDark } = useMemo(() => {
    // 배경이 없으면 기본값 사용
    if (!background) {
      const defaultPreset = DEFAULT_BACKGROUND;
      return {
        gradientStyle: {
          background: `linear-gradient(135deg, ${defaultPreset.style.from}, ${defaultPreset.style.via || defaultPreset.style.from}, ${defaultPreset.style.to})`,
        },
        pattern: defaultPreset.style.pattern || "none",
        isDark: isDarkColor(defaultPreset.style.from),
      };
    }

    // 이미지 타입
    if (background.type === "image") {
      return {
        gradientStyle: {
          backgroundImage: `url(${background.value})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        },
        pattern: "none",
        isDark: false, // 이미지는 기본적으로 밝은 패턴 사용
      };
    }

    // 프리셋 타입
    if (background.type === "preset") {
      const preset = getPresetById(background.value);
      if (preset) {
        return {
          gradientStyle: {
            background: `linear-gradient(135deg, ${preset.style.from}, ${preset.style.via || preset.style.from}, ${preset.style.to})`,
          },
          pattern: preset.style.pattern || "none",
          isDark: isDarkColor(preset.style.from),
        };
      }
    }

    // 색상 타입
    if (background.type === "color") {
      const color = getColorById(background.value);
      if (color) {
        return {
          gradientStyle: {
            background: `linear-gradient(135deg, ${color.from}, ${color.to})`,
          },
          pattern: background.pattern || "none",
          isDark: isDarkColor(color.from),
        };
      }
    }

    // 폴백: 기본 배경
    const defaultPreset = DEFAULT_BACKGROUND;
    return {
      gradientStyle: {
        background: `linear-gradient(135deg, ${defaultPreset.style.from}, ${defaultPreset.style.via || defaultPreset.style.from}, ${defaultPreset.style.to})`,
      },
      pattern: defaultPreset.style.pattern || "none",
      isDark: false,
    };
  }, [background]);

  return (
    <div className={`relative w-full overflow-hidden ${className}`} style={gradientStyle}>
      {/* 패턴 오버레이 */}
      {pattern && pattern !== "none" && (
        <div className="absolute inset-0 opacity-100">
          <PatternSVG pattern={pattern} isDark={isDark} />
        </div>
      )}

      {/* 자식 요소 */}
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
}

export default StoreBackground;
