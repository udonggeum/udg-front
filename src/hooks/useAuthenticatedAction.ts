"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import type { ApiResponse } from "@/lib/axios";

/**
 * Hook to automatically handle 401 Unauthorized errors
 * Provides utilities to check and handle unauthorized API responses
 */
export function useAuthenticatedAction() {
  const router = useRouter();
  const { clearAuth } = useAuthStore();

  /**
   * Checks if an API response indicates unauthorized access and handles logout
   * @param result The API response to check
   * @returns true if unauthorized (and logout was triggered), false otherwise
   */
  const checkAndHandleUnauthorized = useCallback(
    <T>(result: ApiResponse<T>): boolean => {
      if (result.isUnauthorized) {
        clearAuth();
        router.push("/login");
        return true;
      }
      return false;
    },
    [clearAuth, router]
  );

  return { checkAndHandleUnauthorized };
}
