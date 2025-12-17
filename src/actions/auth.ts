"use server";

import axios, { AxiosError } from "axios";
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  MessageResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  UpdateProfileRequest,
  UpdateProfileResponse,
} from "@/types/auth";
import { getApiBaseUrl } from "@/lib/api";

const apiClient = axios.create({
  baseURL: `${getApiBaseUrl()}/api/v1`,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * 회원가입 Server Action
 * 서버 사이드에서 실행되므로 CORS 문제 없음
 */
export async function registerUserAction(
  data: RegisterRequest
): Promise<{ success: boolean; data?: AuthResponse; error?: string }> {
  try {
    const response = await apiClient.post<AuthResponse>("/auth/register", data);

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error("Register error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "회원가입에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}

/**
 * 로그인 Server Action
 */
export async function loginUserAction(
  data: LoginRequest
): Promise<{ success: boolean; data?: AuthResponse; error?: string }> {
  try {
    const response = await apiClient.post<AuthResponse>("/auth/login", data);

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error("Login error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "로그인에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}

/**
 * 비밀번호 찾기 Server Action
 */
export async function forgotPasswordAction(
  data: ForgotPasswordRequest
): Promise<{ success: boolean; data?: MessageResponse; error?: string }> {
  try {
    const response = await apiClient.post<MessageResponse>("/auth/forgot-password", data);

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error("Forgot password error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "비밀번호 찾기에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}

/**
 * 비밀번호 재설정 Server Action
 */
export async function resetPasswordAction(
  data: ResetPasswordRequest
): Promise<{ success: boolean; data?: MessageResponse; error?: string }> {
  try {
    const response = await apiClient.post<MessageResponse>("/auth/reset-password", data);

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error("Reset password error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "비밀번호 재설정에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}

/**
 * 로그아웃 Server Action
 * 서버에 refresh token을 보내 토큰을 무효화합니다.
 */
export async function logoutUserAction(
  refreshToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.post("/auth/logout", {
      refresh_token: refreshToken,
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Logout error:", error);

    // 로그아웃은 서버 호출이 실패해도 클라이언트 측 정리는 진행해야 함
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "로그아웃 API 호출에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다.",
    };
  }
}

/**
 * 프로필 업데이트 Server Action
 * 사용자의 이름과 전화번호를 업데이트합니다.
 */
export async function updateProfileAction(
  data: UpdateProfileRequest,
  accessToken: string
): Promise<{ success: boolean; data?: UpdateProfileResponse; error?: string }> {
  try {
    console.log("Updating profile with data:", data);
    console.log("Access token (first 20 chars):", accessToken.substring(0, 20) + "...");

    const response = await apiClient.put<UpdateProfileResponse>("/auth/me", data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error("Update profile error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: string; message?: string }>;

      // 백엔드의 실제 에러 메시지 로깅
      console.error("Backend error response:", {
        status: axiosError.response?.status,
        data: axiosError.response?.data,
        headers: axiosError.response?.headers,
      });

      // 백엔드 에러 메시지 추출 (error 또는 message 필드)
      const backendError = axiosError.response?.data?.error || axiosError.response?.data?.message;

      return {
        success: false,
        error: backendError || "프로필 업데이트에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}
