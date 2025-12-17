import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from "axios";

/**
 * Shared axios instance for all API calls
 * Includes automatic 401 error detection
 */
export const apiClient = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://43.200.249.22:8080'}/api/v1`,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Response interceptor to detect 401 Unauthorized errors
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    // Add isUnauthorized flag for 401 errors
    if (error.response?.status === 401) {
      return Promise.reject({
        ...error,
        isUnauthorized: true,
      });
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
    const axiosError = error as AxiosError<{ message?: string }> & { isUnauthorized?: boolean };

    // 401 Unauthorized
    if (axiosError.response?.status === 401 || axiosError.isUnauthorized) {
      return {
        success: false,
        error: "로그인이 만료되었습니다. 다시 로그인해주세요.",
        isUnauthorized: true,
      };
    }

    return {
      success: false,
      error: axiosError.response?.data?.message || defaultMessage,
    };
  }

  return {
    success: false,
    error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
  };
}
