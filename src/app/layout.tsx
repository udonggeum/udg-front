import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "우리동네금은방 - 투명한 금 거래, 쉽고 빠르게",
  description: "내 주변 금은방의 실시간 시세와 매장 정보를 한 곳에서 비교하고 확인하세요",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "우리동네금은방",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" }, // SVG favicon (투명 배경)
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icon-180x180.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // 웹 접근성 고려 (확대 허용)
  userScalable: true, // 웹 접근성 고려
  viewportFit: "cover", // Safe Area 대응
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="bg-white text-gray-900 font-sans antialiased">
        <ServiceWorkerRegister />
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
