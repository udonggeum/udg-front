import { useEffect, useRef, useState, useCallback } from "react";
import type { WebSocketMessage } from "@/types/chat";
import { useAuthStore } from "@/stores/useAuthStore";
import axios from "axios";
import { toast } from "sonner";

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

  // onMessage 최신 상태 유지
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  // 토큰이 변경되면 ref 업데이트
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  // 토큰 갱신 함수 (ref로 저장하여 dependency 문제 방지)
  const refreshTokenRef = useRef(async (): Promise<string | null> => {
    if (isRefreshingRef.current) {
      console.log("[WebSocket] 이미 토큰 갱신 중...");
      return null;
    }

    try {
      isRefreshingRef.current = true;
      console.log("[WebSocket] 토큰 갱신 시도...");

      const { tokens, updateTokens, clearAuth } = useAuthStore.getState();

      if (!tokens?.refresh_token) {
        console.error("[WebSocket] Refresh token이 없습니다.");
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
        { refresh_token: tokens.refresh_token }
      );

      if (response.data.tokens) {
        const newTokens = {
          access_token: response.data.tokens.access_token,
          refresh_token: response.data.tokens.refresh_token || tokens.refresh_token,
        };

        updateTokens(newTokens);
        tokenRef.current = newTokens.access_token; // ref도 업데이트
        console.log("[WebSocket] 토큰 갱신 성공");
        return newTokens.access_token;
      } else {
        throw new Error("Token refresh failed");
      }
    } catch (error) {
      console.error("[WebSocket] 토큰 갱신 실패:", error);
      const { clearAuth } = useAuthStore.getState();
      clearAuth();
      toast.error("로그인이 만료되었습니다. 다시 로그인해주세요.");
      setTimeout(() => {
        window.location.href = "/login";
      }, 1000);
      return null;
    } finally {
      isRefreshingRef.current = false;
    }
  });

  useEffect(() => {
    // 토큰이 없거나 빈 문자열이면 연결하지 않음
    if (!token || token.trim() === "") return;

    const connect = async (accessToken: string) => {
      try {
        const ws = new WebSocket(`${url}?token=${accessToken}`);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("[WebSocket] 연결 성공");
          setIsConnected(true);
          reconnectAttemptsRef.current = 0; // 연결 성공 시 재시도 카운터 초기화
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as WebSocketMessage;
            onMessageRef.current?.(data);
          } catch (error) {
            console.error("[WebSocket] 메시지 파싱 실패:", error);
          }
        };

        ws.onerror = (error) => {
          console.error("[WebSocket] 에러:", error);
        };

        ws.onclose = async (event) => {
          console.log("[WebSocket] 연결 종료:", event.code, event.reason);
          setIsConnected(false);

          // 정상 종료인 경우 재연결하지 않음
          if (event.code === 1000) {
            console.log("[WebSocket] 정상 종료");
            return;
          }

          // 비정상 종료 (1006) - 원인 파악 필요
          if (event.code === 1006 || event.reason?.includes("401") || event.reason?.includes("Unauthorized")) {
            console.warn("[WebSocket] 비정상 종료 감지, 토큰 상태 확인 중...");

            try {
              // HTTP 요청으로 토큰 유효성 확인
              const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://43.200.249.22:8080';
              await axios.get(
                `${apiBaseUrl}/api/v1/auth/me`,
                {
                  headers: { Authorization: `Bearer ${tokenRef.current}` },
                  timeout: 5000
                }
              );

              // 토큰이 유효한데 WebSocket 연결 실패 = 네트워크 문제
              console.log("[WebSocket] 토큰 유효함, 네트워크 문제로 판단하여 재연결");
              if (autoReconnect) {
                reconnectAttemptsRef.current++;
                const baseDelay = Math.min(1000 * reconnectAttemptsRef.current, 5000);
                const jitter = Math.random() * 500; // 0-0.5초 jitter
                const delay = baseDelay + jitter;
                console.log(`[WebSocket] ${Math.round(delay)}ms 후 재연결 시도 (${reconnectAttemptsRef.current}번째, jitter: ${Math.round(jitter)}ms)`);
                setTimeout(() => connect(tokenRef.current), delay);
              }
            } catch (error: any) {
              // 401 에러 = 토큰 만료
              if (error.response?.status === 401) {
                console.warn("[WebSocket] 토큰 만료 확인됨, 갱신 시도");
                const newToken = await refreshTokenRef.current();
                if (newToken) {
                  console.log("[WebSocket] 새 토큰으로 재연결 시도");
                  setTimeout(() => connect(newToken), 1000);
                }
                return;
              }

              // 다른 에러 = 일반 재연결
              console.error("[WebSocket] 토큰 확인 실패, 일반 재연결 시도:", error.message);
              if (autoReconnect) {
                reconnectAttemptsRef.current++;
                const baseDelay = Math.min(1000 * reconnectAttemptsRef.current, 5000);
                const jitter = Math.random() * 500; // 0-0.5초 jitter
                const delay = baseDelay + jitter;
                console.log(`[WebSocket] ${Math.round(delay)}ms 후 재연결 시도 (${reconnectAttemptsRef.current}번째, jitter: ${Math.round(jitter)}ms)`);
                setTimeout(() => connect(tokenRef.current), delay);
              }
            }
            return;
          }

          // Auto reconnect (무제한 재시도, exponential backoff + jitter로 서버 부하 최소화)
          if (autoReconnect) {
            reconnectAttemptsRef.current++;
            const baseDelay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000); // Exponential backoff
            const jitter = Math.random() * 1000; // 0-1초 랜덤 jitter (thundering herd 방지)
            const delay = baseDelay + jitter;
            console.log(`[WebSocket] ${Math.round(delay)}ms 후 재연결 시도 (${reconnectAttemptsRef.current}번째, jitter: ${Math.round(jitter)}ms)`);

            reconnectTimeoutRef.current = setTimeout(() => {
              // 최신 토큰을 ref에서 가져와서 사용 (클로저 문제 해결)
              connect(tokenRef.current);
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
      if (!document.hidden && wsRef.current?.readyState !== WebSocket.OPEN) {
        console.log("[WebSocket] 페이지 포커스 복귀, 재연결 시도");
        reconnectAttemptsRef.current = 0; // 재시도 카운터 리셋
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        connect(tokenRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
