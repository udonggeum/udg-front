import { useEffect, useRef, useState, useCallback } from "react";
import type { WebSocketMessage } from "@/types/chat";
import { useAuthStore } from "@/stores/useAuthStore";
import axios from "axios";
import { toast } from "sonner";
import { isWebView, onMessageFromNative } from "@/lib/webview";
import { isTokenExpiringSoon, getTimeUntilExpiry, isTokenExpired } from "@/lib/jwt-utils";

interface UseWebSocketOptions {
  url: string;
  token: string;
  onMessage?: (data: WebSocketMessage) => void;
  autoReconnect?: boolean;
}

export function useWebSocket({
  url,
  token,
  onMessage,
  autoReconnect = true,
}: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onMessageRef = useRef(onMessage);
  const reconnectAttemptsRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const tokenRef = useRef(token); // 토큰을 ref로 관리하여 클로저 문제 해결
  const refreshFailureCountRef = useRef(0); // 토큰 갱신 실패 카운터
  const MAX_REFRESH_FAILURES = 3; // 최대 토큰 갱신 실패 허용 횟수
  const MAX_RECONNECT_ATTEMPTS = 10; // 최대 재연결 시도 횟수
  const shouldStopReconnectRef = useRef(false); // 재연결 중단 플래그

  // onMessage 최신 상태 유지
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  // 토큰이 변경되면 ref 업데이트
  // 토큰이 빈 문자열이 되면 (로그아웃) 기존 연결 종료
  useEffect(() => {
    tokenRef.current = token;

    // 로그아웃으로 토큰이 빈 문자열이 되면 WebSocket 연결 종료
    if (!token || token.trim() === "") {
      console.log("[알림 WebSocket] 토큰이 제거되어 연결을 종료합니다");
      shouldStopReconnectRef.current = true;

      // 재연결 타이머 정리
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // 기존 WebSocket 연결 종료
      if (wsRef.current) {
        wsRef.current.close(1000, "Token removed");
        wsRef.current = null;
      }

      setIsConnected(false);
    } else {
      // 토큰이 있으면 재연결 중단 플래그 해제
      shouldStopReconnectRef.current = false;
    }
  }, [token]);

  // 토큰 갱신 함수 (ref로 저장하여 dependency 문제 방지)
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);
  const refreshTokenRef = useRef(async (): Promise<string | null> => {
    // 이미 갱신 중이면 기존 Promise 재사용 (중복 갱신 방지)
    if (isRefreshingRef.current && refreshPromiseRef.current) {
      console.log("[WebSocket] 이미 토큰 갱신 중... 기존 Promise 재사용");
      return refreshPromiseRef.current;
    }

    if (isRefreshingRef.current) {
      console.log("[WebSocket] 이미 토큰 갱신 중...");
      return null;
    }

    // 갱신 실패 횟수 체크
    if (refreshFailureCountRef.current >= MAX_REFRESH_FAILURES) {
      console.error("[WebSocket] 토큰 갱신 실패 횟수 초과, 로그아웃 처리");
      shouldStopReconnectRef.current = true;
      const { clearAuth } = useAuthStore.getState();
      clearAuth();
      toast.error("로그인이 만료되었습니다. 다시 로그인해주세요.");
      setTimeout(() => {
        window.location.href = "/login";
      }, 1000);
      return null;
    }

    // Promise 생성 및 저장
    const promise = (async () => {
      try {
        isRefreshingRef.current = true;
        console.log("[WebSocket] 토큰 갱신 시도...");

      const { tokens, updateTokens, clearAuth } = useAuthStore.getState();

      if (!tokens?.refresh_token) {
        console.error("[WebSocket] Refresh token이 없습니다.");
        shouldStopReconnectRef.current = true;
        clearAuth();
        toast.error("로그인이 만료되었습니다. 다시 로그인해주세요.");
        setTimeout(() => {
          window.location.href = "/login";
        }, 1000);
        return null;
      }

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://43.200.249.22:8080';
      const response = await axios.post(
        `${apiBaseUrl}/api/v1/auth/refresh`,
        { refresh_token: tokens.refresh_token },
        { timeout: 5000 }
      );

      if (response.data.tokens) {
        const newTokens = {
          access_token: response.data.tokens.access_token,
          refresh_token: response.data.tokens.refresh_token || tokens.refresh_token,
        };

        updateTokens(newTokens);
        tokenRef.current = newTokens.access_token; // ref도 업데이트
        refreshFailureCountRef.current = 0; // 성공 시 실패 카운터 초기화
        console.log("[WebSocket] 토큰 갱신 성공");
        return newTokens.access_token;
      } else {
        throw new Error("Token refresh failed");
      }
    } catch (error) {
      refreshFailureCountRef.current++;
      console.error(`[WebSocket] 토큰 갱신 실패 (${refreshFailureCountRef.current}/${MAX_REFRESH_FAILURES}):`, error);

      // 최대 실패 횟수 도달 시 로그아웃
      if (refreshFailureCountRef.current >= MAX_REFRESH_FAILURES) {
        shouldStopReconnectRef.current = true;
        const { clearAuth } = useAuthStore.getState();
        clearAuth();
        toast.error("로그인이 만료되었습니다. 다시 로그인해주세요.");
        setTimeout(() => {
          window.location.href = "/login";
        }, 1000);
      }

      return null;
      } finally {
        isRefreshingRef.current = false;
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = promise;
    return promise;
  });

  // ⭐ 토큰 만료 전 자동 갱신 (Option C 핵심 로직)
  useEffect(() => {
    if (!token || token.trim() === "") return;

    // 토큰 만료 체크 타이머 (1분마다 실행)
    const tokenCheckInterval = setInterval(async () => {
      const currentToken = tokenRef.current;

      // 토큰이 없으면 체크 중단
      if (!currentToken || currentToken.trim() === "") {
        return;
      }

      // 토큰이 이미 만료되었는지 체크
      if (isTokenExpired(currentToken)) {
        console.warn("[WebSocket] 토큰이 이미 만료됨, 즉시 갱신 시도");
        const newToken = await refreshTokenRef.current();
        if (newToken && wsRef.current) {
          // 기존 연결 종료하고 새 토큰으로 재연결
          console.log("[WebSocket] 만료된 토큰으로 재연결 중...");
          wsRef.current.close(1000, "Token expired, reconnecting");
        }
        return;
      }

      // 토큰이 5분 이내에 만료될 예정인지 체크
      if (isTokenExpiringSoon(currentToken, 5 * 60 * 1000)) {
        const timeUntilExpiry = getTimeUntilExpiry(currentToken);
        console.log(`[WebSocket] 토큰이 ${Math.round((timeUntilExpiry || 0) / 1000)}초 후 만료됨, 자동 갱신 시작`);

        const newToken = await refreshTokenRef.current();
        if (newToken && wsRef.current) {
          // 기존 연결 종료하고 새 토큰으로 재연결
          console.log("[WebSocket] 새 토큰으로 재연결 중...");
          wsRef.current.close(1000, "Token refreshed, reconnecting");
          // connect 함수가 onclose 핸들러에서 자동으로 재연결함
        }
      }
    }, 60000); // 1분마다 체크

    return () => {
      clearInterval(tokenCheckInterval);
    };
  }, [token]);

  useEffect(() => {
    // 토큰이 없거나 빈 문자열이면 연결하지 않음
    if (!token || token.trim() === "") return;

    const connect = async (accessToken: string) => {
      try {
        // 토큰이 이미 만료되었는지 사전 체크
        if (isTokenExpired(accessToken)) {
          console.warn("[알림 WebSocket] 토큰이 이미 만료되어 로그아웃 처리합니다");
          shouldStopReconnectRef.current = true;

          // 즉시 로그아웃 처리
          const { clearAuth } = useAuthStore.getState();
          clearAuth();
          toast.error("로그인이 만료되었습니다. 다시 로그인해주세요.");
          setTimeout(() => {
            window.location.href = "/login";
          }, 1000);
          return;
        }

        const ws = new WebSocket(`${url}?token=${accessToken}`);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("[알림 WebSocket] 연결 성공");
          setIsConnected(true);
          reconnectAttemptsRef.current = 0; // 연결 성공 시 재시도 카운터 초기화
          refreshFailureCountRef.current = 0; // 재연결 실패 카운터도 초기화
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as WebSocketMessage;
            onMessageRef.current?.(data);
          } catch (error) {
            console.error("[알림 WebSocket] 메시지 파싱 실패:", error);
          }
        };

        ws.onerror = (error) => {
          console.error("[알림 WebSocket] 연결 에러 발생 (토큰 만료 또는 서버 문제일 수 있음)");
        };

        ws.onclose = async (event) => {
          console.log(`[알림 WebSocket] 연결 종료 (코드: ${event.code})`);
          setIsConnected(false);

          // 재연결 중단 플래그가 설정된 경우 재연결하지 않음
          if (shouldStopReconnectRef.current) {
            console.log("[알림 WebSocket] 재연결 중단됨");
            return;
          }

          // 정상 종료인 경우 자동 재연결 (토큰 갱신 후 재연결 포함)
          if (event.code === 1000) {
            // 토큰 갱신으로 인한 재연결인지 확인
            if (event.reason?.includes("reconnecting") || event.reason?.includes("refreshed")) {
              console.log("[알림 WebSocket] 토큰 갱신으로 인한 재연결, 1초 후 재시도");
              reconnectAttemptsRef.current = 0;
              setTimeout(() => connect(tokenRef.current), 1000);
              return;
            }
            console.log("[알림 WebSocket] 정상 종료");
            return;
          }

          // 1006 에러: 비정상 종료 (서버 다운, 네트워크 문제, 또는 인증 실패)
          if (event.code === 1006) {
            console.warn("[알림 WebSocket] 비정상 종료 (1006) - 서버 문제 또는 인증 실패 가능성");

            // 현재 토큰이 만료되었는지 확인
            if (isTokenExpired(tokenRef.current)) {
              console.warn("[알림 WebSocket] 토큰이 만료되었습니다. 토큰 갱신 시도");
              const newToken = await refreshTokenRef.current();
              if (newToken && !shouldStopReconnectRef.current) {
                console.log("[알림 WebSocket] 새 토큰으로 재연결 시도");
                reconnectAttemptsRef.current = 0;
                setTimeout(() => connect(newToken), 2000);
              }
              return;
            }
          }

          // 401 에러 (토큰 만료) - 명시적인 인증 실패
          if (event.reason?.includes("401") || event.reason?.includes("Unauthorized")) {
            console.warn("[알림 WebSocket] 401 인증 에러 감지, 토큰 갱신 시도");

            // 토큰 갱신 시도
            const newToken = await refreshTokenRef.current();
            if (newToken && !shouldStopReconnectRef.current) {
              console.log("[알림 WebSocket] 새 토큰으로 재연결 시도");
              reconnectAttemptsRef.current = 0;
              setTimeout(() => connect(newToken), 1000);
            }
            return;
          }

          // Auto reconnect (네트워크 문제 등으로 인한 일반 재연결)
          if (autoReconnect && !shouldStopReconnectRef.current) {
            reconnectAttemptsRef.current++;

            // 최대 재연결 시도 횟수 체크
            if (reconnectAttemptsRef.current > MAX_RECONNECT_ATTEMPTS) {
              console.error(`[알림 WebSocket] 최대 재연결 시도 횟수(${MAX_RECONNECT_ATTEMPTS})를 초과했습니다. 재연결을 중단합니다.`);
              shouldStopReconnectRef.current = true;
              return;
            }

            const baseDelay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000); // Exponential backoff
            const jitter = Math.random() * 1000; // 0-1초 랜덤 jitter (thundering herd 방지)
            const delay = baseDelay + jitter;
            console.log(`[알림 WebSocket] ${Math.round(delay)}ms 후 재연결 시도 (jitter: ${Math.round(jitter)}ms)`);

            reconnectTimeoutRef.current = setTimeout(() => {
              if (!shouldStopReconnectRef.current) {
                // 최신 토큰을 ref에서 가져와서 사용 (클로저 문제 해결)
                connect(tokenRef.current);
              }
            }, delay) as NodeJS.Timeout;
          }
        };
      } catch (error) {
        console.error("[WebSocket] 연결 생성 실패:", error);
      }
    };

    // 초기 연결만 수행 (토큰이 없을 때만 연결)
    if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
      connect(token);
    }

    // 페이지 포커스 시 즉시 재연결 (탭 전환 후 돌아왔을 때)
    const handleVisibilityChange = () => {
      if (!document.hidden && wsRef.current?.readyState !== WebSocket.OPEN && !shouldStopReconnectRef.current) {
        console.log("[WebSocket] 페이지 포커스 복귀, 재연결 시도");
        reconnectAttemptsRef.current = 0; // 재시도 카운터 리셋
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        connect(tokenRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 앱 라이프사이클 대응 (웹뷰 환경에서만)
    let cleanupAppStateListener: (() => void) | undefined;

    if (isWebView()) {
      const handleAppStateChange = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'APP_STATE_CHANGE') {
            if (data.state === 'background') {
              // 앱이 백그라운드로 갈 때 WebSocket 연결 유지 또는 종료
              console.log("[WebSocket] 앱 백그라운드 진입");
              // 필요시 연결 종료: wsRef.current?.close(1000, "App background");
            } else if (data.state === 'active') {
              // 앱이 포그라운드로 돌아올 때 재연결
              if (wsRef.current?.readyState !== WebSocket.OPEN && !shouldStopReconnectRef.current) {
                console.log("[WebSocket] 앱 포그라운드 복귀, 재연결 시도");
                reconnectAttemptsRef.current = 0;
                if (reconnectTimeoutRef.current) {
                  clearTimeout(reconnectTimeoutRef.current);
                }
                connect(tokenRef.current);
              }
            }
          }
        } catch (error) {
          // JSON 파싱 실패 시 무시
        }
      };

      cleanupAppStateListener = onMessageFromNative(handleAppStateChange);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cleanupAppStateListener?.();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        // 정상 종료로 표시하여 onclose에서 재연결하지 않도록 함
        wsRef.current.close(1000, "Component unmount");
      }
    };
  }, [url, autoReconnect]); // ✅ token을 의존성에서 제거하여 토큰 변경 시 재연결 방지

  const sendMessage = (message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    console.warn("[WebSocket] 메시지 전송 실패: 연결되지 않음");
    return false;
  };

  return {
    isConnected,
    sendMessage,
  };
}
