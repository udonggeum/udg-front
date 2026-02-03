"use client";

import { useEffect } from "react";
import { initializeApp, isNativePlatform } from "@/lib/capacitor";

/**
 * Capacitor 앱 초기화 컴포넌트
 */
export function CapacitorInit() {
  useEffect(() => {
    if (isNativePlatform()) {
      console.log("[App] Running in native app mode");
      initializeApp();
    } else {
      console.log("[App] Running in web mode");
    }
  }, []);

  return null;
}
