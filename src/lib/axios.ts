import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { translateErrorMessage } from "./error-messages";
import { getApiBaseUrl } from "./api";

/**
 * URL에서 민감한 파라미터 제거 (안전한 로깅용)
 */
function sanitizeUrl(url?: string): string {
  if (!url) return 'unknown';
  // Query params 제거, path params는 ID만 마스킹
  return url.split('?')[0].replace(/\/\d+/g, '/:id');
}

/**
 * 에러 정보에서 민감한 데이터 제거
 */
function sanitizeErrorData(data: any): any {
  if (!data) return {};
  const { password, token, refresh_token, access_token, authorization, ...safe } = data;
  return safe;
}

/**
 * Shared axios instance for all API calls
 * Includes automatic token injection and 401 error detection with token refresh
 */
export const apiClient = axios.create({
  baseURL: `${getApiBaseUrl()}/api/v1`,
  timeout: 15000, // 15초로 증가
  headers: {
    "Content-Type": "application/json",
  },
  validateStatus: (status) => {
    // 401은 interceptor에서 처리하므로 정상으로 간주하지 않음
    return status >= 200 && status < 300;
  },
});

// 토큰 갱신 중인지 추적
let isRefreshing = false;
let refreshPromise: Promise<any> | null = null; // refresh Promise 저장
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

// 디버깅용: 마지막 refresh 시도 시간
let lastRefreshAttempt = 0;
const REFRESH_COOLDOWN = 1000; // 1초 내 중복 refresh 방지
const REFRESH_TIMEOUT = 10000; // 10초 후에도 refresh가 안 끝나면 강제 리셋

// refresh 타임아웃 타이머
let refreshTimeoutId: NodeJS.Timeout | null = null;

/**
 * Request interceptor to automatically inject access token and log requests
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const requestId = Math.random().toString(36).substring(7);

    // Config에 request ID 저장 (에러 추적용)
    (config as any)._requestId = requestId;
    (config as any)._requestStartTime = Date.now();

    // refresh 엔드포인트는 토큰 자동 추가 제외 (수동으로 refresh_token 전달)
    if (config.url?.includes('/auth/refresh')) {
      return config;
    }

    // 브라우저 환경에서만 실행
    if (typeof window !== "undefined") {
      try {
        // localStorage에서 토큰 가져오기
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          const parsed = JSON.parse(authStorage);
          const accessToken = parsed.state?.tokens?.access_token;

          if (accessToken && !config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${accessToken}`;
          } else if (!accessToken) {
            console.warn("[Request] Access token 없음 - 인증이 필요한 요청은 401 발생 예상");
          }
        } else {
          console.warn("[Request] Auth storage 없음 - 로그인 필요");
        }
      } catch (error) {
        console.error("[Request] 토큰 주입 실패:", error);
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const processQueue = (error: any = null) => {
  const queueLength = failedQueue.length;
  if (queueLength > 0) {
    console.log(`[Token Refresh] 대기열 처리 중 (${queueLength}개 요청)`);
  }

  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });

  failedQueue = [];
};

/**
 * Response interceptor to detect 401 Unauthorized errors and auto-refresh tokens
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // 성공 응답은 조용히 처리 (성능 및 보안)
    return response;
  },
  async (error: AxiosError<{ error?: string; message?: string; token_expired?: boolean }>) => {
    // 에러만 안전하게 로깅 (민감정보 제거)
    const config = error.config as any;
    const method = error.config?.method?.toUpperCase();
    const url = sanitizeUrl(error.config?.url);
    const status = error.response?.status;
    const backendError = error.response?.data?.error;

    // 최소한의 정보만 로깅
    console.error(`❌ API Error [${method} ${url}]`, {
      status: status || 'Network Error',
      error: backendError || error.message,
      code: error.code,
    });

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log("[Token Refresh] 401 에러 감지", {
        url: sanitizeUrl(originalRequest.url),
        isRefreshing,
        hasRetried: originalRequest._retry,
      });

      // 로그인/회원가입 엔드포인트는 401 자동 처리 제외 (로그인 실패와 토큰 만료를 구분)
      if (originalRequest.url?.includes('/auth/login') ||
          originalRequest.url?.includes('/auth/register')) {
        console.log("[Token Refresh] 로그인/회원가입 엔드포인트 401 - 자동 처리 제외");
        return Promise.reject(error);
      }

      // refresh 엔드포인트 자체에서 401이 나면 즉시 로그아웃
      if (originalRequest.url?.includes('/auth/refresh')) {
        console.error("[Token Refresh] Refresh 엔드포인트에서 401 - 로그아웃 처리");
        if (typeof window !== "undefined") {
          import("@/stores/useAuthStore").then(({ useAuthStore }) => {
            const { clearAuth } = useAuthStore.getState();
            clearAuth();

            import("sonner").then(({ toast }) => {
              const errorMsg = error.response?.data?.error || error.response?.data?.message;
              toast.error(errorMsg ? `로그인 세션이 만료되었습니다: ${errorMsg}` : "로그인이 만료되었습니다. 다시 로그인해주세요.");
            });

            setTimeout(() => {
              window.location.href = "/login";
            }, 1000);
          });
        }
        return Promise.reject(error);
      }

      // 백엔드에서 token_expired 플래그 확인
      const isTokenExpired = error.response?.data?.token_expired === true;

      // 토큰 갱신 시도
      if (isRefreshing && refreshPromise) {
        // 이미 갱신 중이면 기존 Promise를 재사용
        console.log("[Token Refresh] 이미 갱신 중 - 대기열에 추가");
        return refreshPromise
          .then(() => {
            // 최신 토큰을 가져와서 헤더에 적용
            if (typeof window !== "undefined") {
              const authStorage = localStorage.getItem('auth-storage');
              if (authStorage) {
                const parsed = JSON.parse(authStorage);
                const latestToken = parsed.state?.tokens?.access_token;

                if (originalRequest.headers && latestToken) {
                  originalRequest.headers.Authorization = `Bearer ${latestToken}`;
                  console.log("[Token Refresh] 대기 중이던 요청 재시도:", sanitizeUrl(originalRequest.url));
                  return apiClient(originalRequest);
                }
              }
            }
            throw new Error("No token after refresh");
          })
          .catch((err) => {
            console.error("[Token Refresh] 대기 중 에러:", err.message);
            return Promise.reject(err);
          });
      }

      // 중복 refresh 방지 (1초 내 재시도 방지)
      const now = Date.now();
      if (now - lastRefreshAttempt < REFRESH_COOLDOWN) {
        console.warn("[Token Refresh] 너무 빠른 재시도 차단");
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      isRefreshing = true;
      lastRefreshAttempt = now;
      console.log("[Token Refresh] 토큰 갱신 시작");

      // 타임아웃 안전장치: 10초 후에도 refresh가 안 끝나면 강제 리셋
      refreshTimeoutId = setTimeout(() => {
        if (isRefreshing) {
          console.error("[Token Refresh] 타임아웃 - 강제 리셋");
          isRefreshing = false;
          refreshPromise = null;
          processQueue(new Error("Token refresh timeout"));
        }
      }, REFRESH_TIMEOUT);

      if (typeof window !== "undefined") {
        // refresh Promise 생성 및 저장
        refreshPromise = (async () => {
          try {
            const { useAuthStore } = await import("@/stores/useAuthStore");
            const { tokens, updateTokens, clearAuth } = useAuthStore.getState();

            // refresh_token 검증
            if (!tokens?.refresh_token) {
              console.error("[Token Refresh] Refresh token 없음");
              throw new Error("No refresh token available");
            }

            console.log("[Token Refresh] Refresh token으로 새 토큰 요청 중...");

            // 리프레시 토큰으로 새 액세스 토큰 요청 (타임아웃 5초)
            const response = await axios.post(
              `${apiClient.defaults.baseURL}/auth/refresh`,
              { refresh_token: tokens.refresh_token },
              { timeout: 5000 }
            );

            if (response.data.tokens) {
              // 백엔드는 항상 새 refresh_token을 보내야 함 (token rotation)
              if (!response.data.tokens.access_token || !response.data.tokens.refresh_token) {
                throw new Error("Invalid token response: missing access_token or refresh_token");
              }

              const newTokens = {
                access_token: response.data.tokens.access_token,
                refresh_token: response.data.tokens.refresh_token,
              };

              console.log("[Token Refresh] 토큰 갱신 성공");

              // 새 토큰 저장
              updateTokens(newTokens);

              // 원래 요청 헤더에 새 토큰 적용
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
              }

              processQueue(null);

              // 원래 요청 재시도
              return apiClient(originalRequest);
            } else {
              throw new Error("Token refresh failed: no tokens in response");
            }
          } catch (refreshError) {
            console.error("[Token Refresh] 갱신 실패:", refreshError);
            processQueue(refreshError);

            // 갱신 실패 시 로그아웃
            const { useAuthStore } = await import("@/stores/useAuthStore");
            const { clearAuth } = useAuthStore.getState();

            console.log("[Token Refresh] 로그아웃 처리 및 리다이렉트");
            clearAuth();

            const { toast } = await import("sonner");

            // 백엔드에서 보낸 세분화된 에러를 활용하여 구체적인 메시지 제공
            let errorMessage = "로그인이 만료되었습니다. 다시 로그인해주세요.";
            if (axios.isAxiosError(refreshError)) {
              if (refreshError.code === 'ECONNABORTED' || refreshError.message?.includes('timeout')) {
                errorMessage = "네트워크 연결이 불안정합니다. 다시 로그인해주세요.";
              } else if (!refreshError.response) {
                errorMessage = "서버에 연결할 수 없습니다. 네트워크를 확인 후 다시 로그인해주세요.";
              } else if (refreshError.response.status === 401) {
                const backendError = refreshError.response.data?.error;
                const backendMessage = refreshError.response.data?.message;

                // 백엔드에서 보낸 세분화된 에러 처리
                if (backendError === "refresh_token_revoked") {
                  errorMessage = "토큰이 이미 사용되었습니다. 보안을 위해 다시 로그인해주세요.";
                } else if (backendError === "refresh_token_expired") {
                  errorMessage = "로그인 세션이 만료되었습니다 (7일). 다시 로그인해주세요.";
                } else if (backendError === "invalid_refresh_token") {
                  errorMessage = "유효하지 않은 토큰입니다. 다시 로그인해주세요.";
                } else if (backendMessage) {
                  // 백엔드에서 보낸 메시지가 있으면 사용
                  errorMessage = backendMessage;
                } else {
                  errorMessage = "로그인 세션이 만료되었습니다. 다시 로그인해주세요.";
                }
              }
            }

            toast.error(errorMessage);

            // 확실한 리다이렉트
            setTimeout(() => {
              window.location.href = "/login";
            }, 1500);

            return Promise.reject(refreshError);
          } finally {
            // 타임아웃 타이머 클리어
            if (refreshTimeoutId) {
              clearTimeout(refreshTimeoutId);
              refreshTimeoutId = null;
            }

            // 반드시 플래그와 Promise 리셋
            isRefreshing = false;
            refreshPromise = null;
            console.log("[Token Refresh] 갱신 프로세스 종료");
          }
        })();

        return refreshPromise;
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Standard API response type
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  isUnauthorized?: boolean;
}

/**
 * Helper function to handle API errors consistently
 * @param error - The error object
 * @param defaultMessage - Default user-friendly message
 * @param apiName - API endpoint/action name for debugging (optional)
 */
export function handleApiError<T = unknown>(
  error: unknown,
  defaultMessage: string,
  apiName?: string
): ApiResponse<T> {
  // apiName은 interceptor에서 이미 로깅됨

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: string; message?: string }> & { isUnauthorized?: boolean };

    // Timeout 에러 처리
    if (axiosError.code === 'ECONNABORTED' || axiosError.message?.includes('timeout')) {
      return {
        success: false,
        error: "요청 시간이 초과되었습니다. 네트워크 상태를 확인해주세요.",
      };
    }

    // 네트워크 에러 처리 (서버 응답 없음)
    if (!axiosError.response) {
      return {
        success: false,
        error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
      };
    }

    // 401 Unauthorized 처리
    if (axiosError.response?.status === 401) {
      // 백엔드 응답: { error: "ERROR_CODE", message: "사용자 친화적 메시지" }
      const errorCode = axiosError.response?.data?.error;
      const errorMessage = axiosError.response?.data?.message;

      // isUnauthorized 플래그가 있거나 에러 정보가 없을 때만 기본 메시지
      if (axiosError.isUnauthorized || (!errorCode && !errorMessage)) {
        return {
          success: false,
          error: "로그인이 만료되었습니다. 다시 로그인해주세요.",
          isUnauthorized: true,
        };
      }

      // 에러 코드 우선, 없으면 message 사용
      // message가 이미 한글이면 그대로 사용, 아니면 error 코드를 번역
      const displayMessage = errorMessage && errorMessage.length > 0
        ? errorMessage
        : translateErrorMessage(errorCode || "AUTH_UNAUTHORIZED");

      return {
        success: false,
        error: displayMessage,
        isUnauthorized: true,
      };
    }

    // 다른 HTTP 에러 처리
    // 백엔드 응답 형식: { error: "ERROR_CODE", message: "사용자 친화적 메시지" }
    const errorCode = axiosError.response?.data?.error;
    const errorMessage = axiosError.response?.data?.message;

    if (errorCode || errorMessage) {
      // message가 있고 한글이면 그대로 사용 (백엔드가 명확한 메시지 제공)
      // message가 없거나 영문이면 error 코드를 번역
      const displayMessage = errorMessage && errorMessage.length > 0
        ? errorMessage
        : translateErrorMessage(errorCode || "");

      return {
        success: false,
        error: displayMessage || defaultMessage,
      };
    }

    return {
      success: false,
      error: defaultMessage,
    };
  }

  return {
    success: false,
    error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
  };
}
