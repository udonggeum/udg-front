import { useEffect, useRef, useState } from "react";
import type { WebSocketMessage } from "@/types/chat";

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

  // onMessage 최신 상태 유지
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!token) return;

    const connect = () => {
      try {
        const ws = new WebSocket(`${url}?token=${token}`);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as WebSocketMessage;
            onMessageRef.current?.(data);
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error);
          }
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
        };

        ws.onclose = () => {
          setIsConnected(false);

          // Auto reconnect after 3 seconds
          if (autoReconnect) {
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, 3000) as NodeJS.Timeout;
          }
        };
      } catch (error) {
        console.error("Failed to create WebSocket:", error);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url, token, autoReconnect]);

  const sendMessage = (message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  };

  return {
    isConnected,
    sendMessage,
  };
}
