"use client";

import { useEffect } from "react";

/**
 * Service Worker 등록 컴포넌트
 * 오프라인 지원 및 캐싱 기능 제공
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    // 프로덕션 환경에서만 Service Worker 등록
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("Service Worker registered:", registration.scope);

            // 업데이트 확인
            registration.addEventListener("updatefound", () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener("statechange", () => {
                  if (
                    newWorker.state === "installed" &&
                    navigator.serviceWorker.controller
                  ) {
                    console.log("New Service Worker available");
                    // 필요시 사용자에게 새로고침 안내 가능
                  }
                });
              }
            });
          })
          .catch((error) => {
            console.error("Service Worker registration failed:", error);
          });
      });
    }
  }, []);

  return null;
}
