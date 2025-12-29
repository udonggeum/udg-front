import React from "react";
import { cn } from "@/lib/utils";

/**
 * Container - 최대 너비가 제한된 컨테이너
 * 모든 페이지에서 일관된 컨텐츠 너비 유지
 */
interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function Container({ children, className }: ContainerProps) {
  return (
    <div className={cn("max-w-[1200px] mx-auto px-5", className)}>
      {children}
    </div>
  );
}

/**
 * Section - 페이지 섹션 래퍼
 * 일관된 패딩과 배경색 제공
 */
interface SectionProps {
  children: React.ReactNode;
  className?: string;
  background?: "white" | "gray" | "gradient";
}

export function Section({ children, className, background = "white" }: SectionProps) {
  const backgroundClasses = {
    white: "bg-white",
    gray: "bg-gray-50",
    gradient: "bg-gradient-to-b from-gray-50 to-white",
  };

  return (
    <section
      className={cn(
        "py-12",
        backgroundClasses[background],
        className
      )}
    >
      {children}
    </section>
  );
}

/**
 * PageHeader - 페이지 상단 헤더
 * 제목, 설명, 액션 버튼을 일관되게 표시
 */
interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6", className)}>
      <div>
        <h1 className="text-[1.75rem] sm:text-[2rem] md:text-[2.5rem] font-bold leading-tight tracking-[-0.02em] text-gray-900 mb-2">
          {title}
        </h1>
        {description && (
          <p className="text-[0.9375rem] text-gray-600">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

/**
 * SectionHeader - 섹션 헤더
 * 섹션 제목과 "전체보기" 링크를 일관되게 표시
 */
interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, description, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-6", className)}>
      <div>
        <h2 className="text-[1.375rem] font-bold text-gray-900 mb-1">{title}</h2>
        {description && (
          <p className="text-[0.875rem] text-gray-600">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

/**
 * Card - 일관된 카드 컴포넌트
 * 프로젝트 전체에서 사용할 수 있는 기본 카드
 */
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, hover = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white p-5 rounded-2xl card-shadow smooth-transition border-0",
        hover && "hover-lift cursor-pointer",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}
