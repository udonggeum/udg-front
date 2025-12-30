"use server";

import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  MessageResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  UpdateProfileRequest,
  UpdateProfileResponse,
  User,
  SendEmailVerificationRequest,
  VerifyEmailRequest,
  SendPhoneVerificationRequest,
  VerifyPhoneRequest,
} from "@/types/auth";
import { apiClient, handleApiError, type ApiResponse } from "@/lib/axios";

/**
 * 회원가입 Server Action
 * 서버 사이드에서 실행되므로 CORS 문제 없음
 */
export async function registerUserAction(
  data: RegisterRequest
): Promise<ApiResponse<AuthResponse>> {
  try {
    const response = await apiClient.post<AuthResponse>("/auth/register", data);

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "회원가입에 실패했습니다.");
  }
}

/**
 * 로그인 Server Action
 */
export async function loginUserAction(
  data: LoginRequest
): Promise<ApiResponse<AuthResponse>> {
  try {
    const response = await apiClient.post<AuthResponse>("/auth/login", data);

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "로그인에 실패했습니다.");
  }
}

/**
 * 비밀번호 찾기 Server Action
 */
export async function forgotPasswordAction(
  data: ForgotPasswordRequest
): Promise<ApiResponse<MessageResponse>> {
  try {
    const response = await apiClient.post<MessageResponse>("/auth/forgot-password", data);

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "비밀번호 찾기에 실패했습니다.");
  }
}

/**
 * 비밀번호 재설정 Server Action
 */
export async function resetPasswordAction(
  data: ResetPasswordRequest
): Promise<ApiResponse<MessageResponse>> {
  try {
    const response = await apiClient.post<MessageResponse>("/auth/reset-password", data);

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "비밀번호 재설정에 실패했습니다.");
  }
}

/**
 * 로그아웃 Server Action
 * 서버에 refresh token을 보내 토큰을 무효화합니다.
 */
export async function logoutUserAction(
  refreshToken: string
): Promise<ApiResponse> {
  try {
    await apiClient.post("/auth/logout", {
      refresh_token: refreshToken,
    });

    return {
      success: true,
    };
  } catch (error) {
    // 로그아웃은 서버 호출이 실패해도 클라이언트 측 정리는 진행해야 함
    return handleApiError(error, "로그아웃 API 호출에 실패했습니다.");
  }
}

/**
 * 현재 사용자 정보 조회 Server Action
 * 토큰으로 사용자 정보를 가져옵니다.
 */
export async function getMeAction(
  accessToken: string
): Promise<ApiResponse<{ user: User }>> {
  try {
    const response = await apiClient.get<{ user: User }>("/auth/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "사용자 정보 조회에 실패했습니다.");
  }
}

/**
 * 프로필 업데이트 Server Action
 * 사용자의 이름과 전화번호를 업데이트합니다.
 */
export async function updateProfileAction(
  data: UpdateProfileRequest,
  accessToken: string
): Promise<ApiResponse<UpdateProfileResponse>> {
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
    return handleApiError(error, "프로필 업데이트에 실패했습니다.");
  }
}

/**
 * 이메일 인증 코드 전송 Server Action
 * 회원가입 시 이메일 주소로 6자리 인증 코드를 전송합니다.
 */
export async function sendEmailVerificationAction(
  data: SendEmailVerificationRequest
): Promise<ApiResponse<MessageResponse>> {
  try {
    const response = await apiClient.post<MessageResponse>(
      "/auth/send-email-verification",
      data
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "이메일 인증 코드 전송에 실패했습니다.");
  }
}

/**
 * 이메일 인증 코드 확인 Server Action
 * 사용자가 입력한 인증 코드를 확인합니다.
 */
export async function verifyEmailAction(
  data: VerifyEmailRequest
): Promise<ApiResponse<MessageResponse>> {
  try {
    const response = await apiClient.post<MessageResponse>(
      "/auth/verify-email",
      data
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "이메일 인증에 실패했습니다.");
  }
}

/**
 * 휴대폰 인증 코드 전송 Server Action
 * 로그인한 사용자의 휴대폰 번호로 6자리 인증 코드를 전송합니다.
 */
export async function sendPhoneVerificationAction(
  data: SendPhoneVerificationRequest,
  accessToken: string
): Promise<ApiResponse<MessageResponse>> {
  try {
    const response = await apiClient.post<MessageResponse>(
      "/auth/send-phone-verification",
      data,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "휴대폰 인증 코드 전송에 실패했습니다.");
  }
}

/**
 * 휴대폰 인증 코드 확인 Server Action
 * 사용자가 입력한 인증 코드를 확인하고 휴대폰 번호를 인증합니다.
 */
export async function verifyPhoneAction(
  data: VerifyPhoneRequest,
  accessToken: string
): Promise<ApiResponse<MessageResponse>> {
  try {
    const response = await apiClient.post<MessageResponse>(
      "/auth/verify-phone",
      data,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "휴대폰 인증에 실패했습니다.");
  }
}
