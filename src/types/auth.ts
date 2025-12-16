/**
 * User type
 * 사용자 정보
 */
export interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  role: 'user' | 'admin';
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
  phone?: string;
  address?: string;
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
