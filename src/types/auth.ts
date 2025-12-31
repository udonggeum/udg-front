/**
 * User type
 * 사용자 정보
 */
export interface User {
  id: number;
  email: string;
  name: string;
  nickname?: string;
  phone?: string;
  address?: string;
  latitude?: number;  // 위도 (주소 기반)
  longitude?: number; // 경도 (주소 기반)
  profile_image?: string;
  role: 'user' | 'admin';

  // 인증 관련 필드
  email_verified?: boolean;
  email_verified_at?: string;
  phone_verified?: boolean;
  phone_verified_at?: string;

  created_at?: string;
  updated_at?: string;
}

/**
 * Tokens type
 * JWT 토큰
 */
export interface Tokens {
  access_token: string;
  refresh_token: string;
}

/**
 * Auth response type
 * 로그인/회원가입 응답
 */
export interface AuthResponse {
  message: string;
  user: User;
  tokens: Tokens;
}

/**
 * Login request type
 * 로그인 요청
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Register request type
 * 회원가입 요청
 */
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  nickname?: string;
  phone?: string;
}

/**
 * Message response type
 * 일반 메시지 응답
 */
export interface MessageResponse {
  message: string;
}

/**
 * Forgot password request type
 * 비밀번호 찾기 요청
 */
export interface ForgotPasswordRequest {
  email: string;
}

/**
 * Reset password request type
 * 비밀번호 재설정 요청
 */
export interface ResetPasswordRequest {
  token: string;
  password: string;
}

/**
 * Update profile request type
 * 프로필 업데이트 요청
 */
export interface UpdateProfileRequest {
  name: string;
  nickname?: string;
  phone?: string;
  address?: string;
  profile_image?: string;
}

/**
 * Update profile response type
 * 프로필 업데이트 응답
 */
export interface UpdateProfileResponse {
  message: string;
  user: User;
}

/**
 * OAuth callback request type
 * OAuth 콜백 요청 (authorization code 전달)
 */
export interface OAuthCallbackRequest {
  code: string;
}

/**
 * OAuth provider type
 * 지원하는 OAuth 제공자
 */
export type OAuthProvider = 'kakao' | 'google' | 'naver' | 'apple';

/**
 * Send email verification request type
 * 이메일 인증 코드 전송 요청
 */
export interface SendEmailVerificationRequest {
  email: string;
}

/**
 * Verify email request type
 * 이메일 인증 코드 확인 요청
 */
export interface VerifyEmailRequest {
  email: string;
  code: string;
}

/**
 * Send phone verification request type
 * 휴대폰 인증 코드 전송 요청
 */
export interface SendPhoneVerificationRequest {
  phone: string;
}

/**
 * Verify phone request type
 * 휴대폰 인증 코드 확인 요청
 */
export interface VerifyPhoneRequest {
  phone: string;
  code: string;
}
