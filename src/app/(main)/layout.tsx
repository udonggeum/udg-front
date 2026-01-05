"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // 채팅방 상세 페이지에서는 푸터 숨김 (/chats/123 형태)
  const hideFooter = pathname ? /^\/chats\/\d+/.test(pathname) : false;

  return (
    <>
      <Header />
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
      {!hideFooter && <Footer />}
    </>
  );
}
