import { z } from 'zod';

/**
 * 인증 관련 에러 메시지
 */
export const AUTH_ERRORS = {
  EMAIL_REQUIRED: '이메일을 입력해주세요',
  EMAIL_INVALID: '올바른 이메일 형식이 아닙니다',
  PASSWORD_REQUIRED: '비밀번호를 입력해주세요',
  PASSWORD_MIN_LENGTH: '비밀번호는 최소 8자 이상이어야 합니다',
  NAME_REQUIRED: '이름을 입력해주세요',
  PHONE_INVALID: '올바른 전화번호 형식이 아닙니다 (예: 010-1234-5678)',
} as const;

/**
 * User schema
 * API 응답 및 localStorage의 사용자 데이터 검증
 */
export const UserSchema = z.object({
  id: z.number().int().positive(),
  email: z.string().email(AUTH_ERRORS.EMAIL_INVALID),
  name: z.string().min(1, AUTH_ERRORS.NAME_REQUIRED),
  phone: z
    .string()
    .regex(
      /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/,
      AUTH_ERRORS.PHONE_INVALID
    )
    .optional(),
  address: z.string().optional(),
  role: z.enum(['user', 'admin']),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type User = z.infer<typeof UserSchema>;

/**
 * Tokens schema
 * 인증 응답의 JWT 토큰 검증
 * 참고: API 응답 검증용이므로 사용자 입력 검증이 아님
 */
export const TokensSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
});

export type Tokens = z.infer<typeof TokensSchema>;

/**
 * Auth response schema
 * 로그인/회원가입 엔드포인트의 완전한 인증 응답 검증
 */
export const AuthResponseSchema = z.object({
  message: z.string(),
  user: UserSchema,
  tokens: TokensSchema,
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

/**
 * Login request schema
 * 로그인 사용자 입력 검증
 * 참고: 보안 강화를 위해 8자 최소 사용 (RegisterPage와 일치)
 */
export const LoginRequestSchema = z.object({
  email: z.string().min(1, AUTH_ERRORS.EMAIL_REQUIRED).email(AUTH_ERRORS.EMAIL_INVALID),
  password: z.string().min(1, AUTH_ERRORS.PASSWORD_REQUIRED).min(8, AUTH_ERRORS.PASSWORD_MIN_LENGTH),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

/**
 * Register request schema
 * 회원가입 사용자 입력 검증
 * 참고: 보안 강화를 위해 8자 최소 사용
 */
export const RegisterRequestSchema = z.object({
  email: z.string().min(1, AUTH_ERRORS.EMAIL_REQUIRED).email(AUTH_ERRORS.EMAIL_INVALID),
  password: z.string().min(1, AUTH_ERRORS.PASSWORD_REQUIRED).min(8, AUTH_ERRORS.PASSWORD_MIN_LENGTH),
  name: z.string().min(1, AUTH_ERRORS.NAME_REQUIRED),
  phone: z
    .string()
    .regex(
      /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/,
      AUTH_ERRORS.PHONE_INVALID
    )
    .optional(),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

/**
 * Me response schema
 * /auth/me 엔드포인트 응답 검증
 */
export const MeResponseSchema = z.object({
  user: UserSchema,
});

export type MeResponse = z.infer<typeof MeResponseSchema>;

/**
 * Update profile request schema
 * 프로필 업데이트 사용자 입력 검증
 * 참고: name, phone, address만 업데이트 가능 (이메일과 비밀번호는 별도 플로우)
 */
export const UpdateProfileRequestSchema = z.object({
  name: z.string().min(1, AUTH_ERRORS.NAME_REQUIRED),
  phone: z
    .string()
    .regex(
      /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/,
      AUTH_ERRORS.PHONE_INVALID
    )
    .optional(),
  address: z.string().optional(),
});

export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

/**
 * Update profile response schema
 * PUT /auth/me 엔드포인트 응답 검증
 */
export const UpdateProfileResponseSchema = z.object({
  message: z.string(),
  user: UserSchema,
});

export type UpdateProfileResponse = z.infer<typeof UpdateProfileResponseSchema>;

/**
 * Forgot password request schema
 * 비밀번호 재설정 요청 사용자 입력 검증
 */
export const ForgotPasswordRequestSchema = z.object({
  email: z.string().min(1, AUTH_ERRORS.EMAIL_REQUIRED).email(AUTH_ERRORS.EMAIL_INVALID),
});

export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;

/**
 * Reset password request schema
 * 비밀번호 재설정 사용자 입력 검증 (토큰 + 새 비밀번호)
 */
export const ResetPasswordRequestSchema = z.object({
  token: z.string().min(1, '재설정 토큰이 필요합니다'),
  password: z.string().min(1, AUTH_ERRORS.PASSWORD_REQUIRED).min(8, AUTH_ERRORS.PASSWORD_MIN_LENGTH),
});

export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;

/**
 * Message response schema
 * API 엔드포인트의 일반 성공/에러 메시지 검증
 */
export const MessageResponseSchema = z.object({
  message: z.string(),
});

export type MessageResponse = z.infer<typeof MessageResponseSchema>;
