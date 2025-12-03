import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "우리동네금은방 - 투명한 금 거래, 쉽고 빠르게",
  description: "내 주변 금은방의 실시간 시세와 매장 정보를 한 곳에서 비교하고 확인하세요",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="bg-white text-gray-900 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
