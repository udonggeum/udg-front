"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { refreshTokenAction } from "@/actions/auth";
import type { ApiResponse } from "@/lib/axios";
import { toast } from "sonner";

/**
 * Hook to automatically handle 401 Unauthorized errors with token refresh
 * Provides utilities to check and handle unauthorized API responses
 */
export function useAuthenticatedAction() {
  const router = useRouter();
  const { tokens, updateTokens, clearAuth } = useAuthStore();
  const isRefreshing = useRef(false);
  const refreshPromise = useRef<Promise<boolean> | null>(null);

  /**
   * Attempts to refresh the access token
   * Returns true if successful, false otherwise
   */
  const tryRefreshToken = useCallback(async (): Promise<boolean> => {
    // 이미 갱신 중이면 기존 Promise 재사용
    if (isRefreshing.current && refreshPromise.current) {
      return refreshPromise.current;
    }

    if (!tokens?.refresh_token) {
      return false;
    }

    isRefreshing.current = true;

    refreshPromise.current = (async () => {
      try {
        const result = await refreshTokenAction(tokens.refresh_token);

        if (result.success && result.data?.tokens) {
          updateTokens(result.data.tokens);
          return true;
        }

        return false;
      } catch {
        return false;
      } finally {
        isRefreshing.current = false;
        refreshPromise.current = null;
      }
    })();

    return refreshPromise.current;
  }, [tokens?.refresh_token, updateTokens]);

  /**
   * Handles logout - clears auth and redirects to login
   */
  const handleLogout = useCallback(() => {
    // 1. 즉시 인증 상태 클리어
    clearAuth();

    // 2. localStorage가 업데이트될 시간을 주기 위해 약간의 지연
    setTimeout(() => {
      // 3. 에러 메시지 표시
      toast.error("로그인이 만료되었습니다. 다시 로그인해주세요.");

      // 4. 로그인 페이지로 리다이렉트 (replace로 뒤로가기 방지)
      router.replace("/login");
    }, 100);
  }, [clearAuth, router]);

  /**
   * Checks if an API response indicates unauthorized access and handles logout
   * @param result The API response to check
   * @returns true if unauthorized (and logout was triggered), false otherwise
   */
  const checkAndHandleUnauthorized = useCallback(
    <T>(result: ApiResponse<T>): boolean => {
      if (result.isUnauthorized) {
        handleLogout();
        return true;
      }
      return false;
    },
    [handleLogout]
  );

  /**
   * Wraps a Server Action with automatic token refresh on 401
   * If the action fails with 401, it will:
   * 1. Try to refresh the token
   * 2. If refresh succeeds, retry the action with new token
   * 3. If refresh fails, logout the user
   *
   * @param action The server action function to call
   * @param getAccessToken Function to get the current access token from store
   * @returns The wrapped action result
   */
  const withTokenRefresh = useCallback(
    async <T>(
      action: (accessToken: string) => Promise<ApiResponse<T>>
    ): Promise<ApiResponse<T>> => {
      const currentToken = useAuthStore.getState().tokens?.access_token;

      if (!currentToken) {
        handleLogout();
        return { success: false, error: "인증 토큰이 없습니다.", isUnauthorized: true };
      }

      // 첫 번째 시도
      const result = await action(currentToken);

      // 성공이면 바로 반환
      if (result.success) {
        return result;
      }

      // 401 에러가 아니면 그대로 반환
      if (!result.isUnauthorized) {
        return result;
      }

      // 401 에러: 토큰 갱신 시도
      const refreshed = await tryRefreshToken();

      if (!refreshed) {
        // 갱신 실패: 로그아웃
        handleLogout();
        return result;
      }

      // 갱신 성공: 새 토큰으로 재시도
      const newToken = useAuthStore.getState().tokens?.access_token;

      if (!newToken) {
        handleLogout();
        return { success: false, error: "토큰 갱신 후 토큰을 찾을 수 없습니다.", isUnauthorized: true };
      }

      // 재시도
      const retryResult = await action(newToken);

      // 재시도도 실패하면 로그아웃
      if (retryResult.isUnauthorized) {
        handleLogout();
      }

      return retryResult;
    },
    [tryRefreshToken, handleLogout]
  );

  return {
    checkAndHandleUnauthorized,
    withTokenRefresh,
    tryRefreshToken,
    handleLogout,
  };
}
