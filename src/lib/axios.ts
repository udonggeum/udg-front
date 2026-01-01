import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from "axios";

/**
 * Shared axios instance for all API calls
 * Includes automatic token injection and 401 error detection with token refresh
 */
export const apiClient = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://43.200.249.22:8080'}/api/v1`,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 토큰 갱신 중인지 추적
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

/**
 * Request interceptor to automatically inject access token
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
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
          }
        }
      } catch (error) {
        console.error('[Axios] Failed to inject token:', error);
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const processQueue = (error: any = null) => {
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
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      // refresh 엔드포인트 자체에서 401이 나면 즉시 로그아웃
      if (originalRequest.url?.includes('/auth/refresh')) {
        if (typeof window !== "undefined") {
          import("@/stores/useAuthStore").then(({ useAuthStore }) => {
            const { clearAuth } = useAuthStore.getState();
            clearAuth();

            import("sonner").then(({ toast }) => {
              toast.error("로그인이 만료되었습니다. 다시 로그인해주세요.");
            });

            setTimeout(() => {
              window.location.href = "/login";
            }, 1000);
          });
        }
        return Promise.reject(error);
      }

      // 토큰 갱신 시도
      if (isRefreshing) {
        // 이미 갱신 중이면 대기열에 추가
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      if (typeof window !== "undefined") {
        try {
          const { useAuthStore } = await import("@/stores/useAuthStore");
          const { tokens, updateTokens, clearAuth } = useAuthStore.getState();

          if (!tokens?.refresh_token) {
            throw new Error("No refresh token available");
          }

          // 리프레시 토큰으로 새 액세스 토큰 요청
          const response = await axios.post(
            `${apiClient.defaults.baseURL}/auth/refresh`,
            { refresh_token: tokens.refresh_token }
          );

          if (response.data.tokens) {
            const newTokens = {
              access_token: response.data.tokens.access_token,
              refresh_token: response.data.tokens.refresh_token || tokens.refresh_token,
            };

            // 새 토큰 저장
            updateTokens(newTokens);

            // 원래 요청 헤더에 새 토큰 적용
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
            }

            processQueue(null);
            isRefreshing = false;

            // 원래 요청 재시도
            return apiClient(originalRequest);
          } else {
            throw new Error("Token refresh failed");
          }
        } catch (refreshError) {
          processQueue(refreshError);
          isRefreshing = false;

          // 갱신 실패 시 로그아웃
          const { useAuthStore } = await import("@/stores/useAuthStore");
          const { clearAuth } = useAuthStore.getState();
          clearAuth();

          const { toast } = await import("sonner");
          toast.error("로그인이 만료되었습니다. 다시 로그인해주세요.");

          setTimeout(() => {
            window.location.href = "/login";
          }, 1000);

          return Promise.reject(refreshError);
        }
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
 */
export function handleApiError<T = unknown>(error: unknown, defaultMessage: string): ApiResponse<T> {
  console.error("API error:", error);

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: string; message?: string }> & { isUnauthorized?: boolean };

    // 401 Unauthorized - 가장 우선적으로 체크
    if (axiosError.response?.status === 401 || axiosError.isUnauthorized) {
      return {
        success: false,
        error: "로그인이 만료되었습니다. 다시 로그인해주세요.",
        isUnauthorized: true,
      };
    }

    return {
      success: false,
      error: axiosError.response?.data?.error || axiosError.response?.data?.message || defaultMessage,
    };
  }

  return {
    success: false,
    error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
  };
}
