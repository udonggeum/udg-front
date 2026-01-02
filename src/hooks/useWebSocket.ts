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
  const maxReconnectAttempts = 5;
  const isRefreshingRef = useRef(false);

  // onMessage 최신 상태 유지
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

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
    if (!token) return;

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

          // 401 Unauthorized - 토큰 만료
          if (event.code === 1006 || event.reason?.includes("401") || event.reason?.includes("Unauthorized")) {
            console.warn("[WebSocket] 인증 실패 감지, 토큰 갱신 시도");

            // 토큰 갱신 시도
            const newToken = await refreshTokenRef.current();
            if (newToken) {
              console.log("[WebSocket] 새 토큰으로 재연결 시도");
              // 새 토큰으로 즉시 재연결
              setTimeout(() => connect(newToken), 1000);
            }
            return;
          }

          // Auto reconnect (최대 재시도 횟수 제한)
          if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000); // Exponential backoff
            console.log(`[WebSocket] ${delay}ms 후 재연결 시도 (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

            reconnectTimeoutRef.current = setTimeout(() => {
              connect(accessToken);
            }, delay) as NodeJS.Timeout;
          } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            console.error("[WebSocket] 최대 재연결 시도 횟수 초과");
            toast.error("채팅 서버 연결에 실패했습니다. 페이지를 새로고침해주세요.");
          }
        };
      } catch (error) {
        console.error("[WebSocket] 연결 생성 실패:", error);
      }
    };

    connect(token);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        // 정상 종료로 표시하여 onclose에서 재연결하지 않도록 함
        wsRef.current.close(1000, "Component unmount");
      }
    };
  }, [url, token, autoReconnect]);

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
