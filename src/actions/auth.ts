"use server";

import axios, { AxiosError } from "axios";
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  MessageResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from "@/types/auth";

const apiClient = axios.create({
  baseURL: "http://43.200.249.22:8080/api/v1",
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
