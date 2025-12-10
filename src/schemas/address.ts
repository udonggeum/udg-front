import { z } from 'zod';

/**
 * 주소 관련 에러 메시지
 */
export const ADDRESS_ERRORS = {
  ADDRESS_NAME_REQUIRED: '배송지명을 입력해주세요',
  RECIPIENT_REQUIRED: '받는 사람을 입력해주세요',
  PHONE_INVALID: '올바른 전화번호 형식이 아닙니다 (예: 010-1234-5678)',
  POSTAL_CODE_INVALID: '우편번호는 5자리 숫자여야 합니다',
  ADDRESS_REQUIRED: '주소를 입력해주세요',
} as const;

/**
 * Address schema
 * API 응답의 주소 데이터 검증
 */
export const AddressSchema = z.object({
  id: z.number().int().positive(),
  user_id: z.number().int().positive(),
  name: z.string().min(1, ADDRESS_ERRORS.ADDRESS_NAME_REQUIRED),
  recipient: z.string().min(1, ADDRESS_ERRORS.RECIPIENT_REQUIRED),
  phone: z
    .string()
    .regex(
      /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/,
      ADDRESS_ERRORS.PHONE_INVALID
    ),
  zip_code: z
    .string()
    .regex(/^\d{5}$/, ADDRESS_ERRORS.POSTAL_CODE_INVALID)
    .optional()
    .default(''),
  address: z.string().min(1, ADDRESS_ERRORS.ADDRESS_REQUIRED),
  detail_address: z.string().optional().default(''),
  is_default: z.boolean(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type Address = z.infer<typeof AddressSchema>;

/**
 * Addresses response schema
 * GET /api/v1/addresses 응답 검증
 */
export const AddressesResponseSchema = z.object({
  addresses: z.array(AddressSchema),
});

export type AddressesResponse = z.infer<typeof AddressesResponseSchema>;

/**
 * Add address request schema
 * 새 주소 추가 요청 검증
 */
export const AddToAddressRequestSchema = z.object({
  name: z.string().min(1, ADDRESS_ERRORS.ADDRESS_NAME_REQUIRED),
  recipient: z.string().min(1, ADDRESS_ERRORS.RECIPIENT_REQUIRED),
  phone: z
    .string()
    .regex(
      /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/,
      ADDRESS_ERRORS.PHONE_INVALID
    ),
  zip_code: z
    .string()
    .regex(/^\d{5}$/, ADDRESS_ERRORS.POSTAL_CODE_INVALID)
    .optional()
    .default(''),
  address: z.string().min(1, ADDRESS_ERRORS.ADDRESS_REQUIRED),
  detail_address: z.string().optional().default(''),
  is_default: z.boolean().optional().default(false),
});

export type AddToAddressRequest = z.infer<typeof AddToAddressRequestSchema>;

/**
 * Update address request schema
 * 주소 수정 요청 검증
 */
export const UpdateAddressRequestSchema = z.object({
  name: z.string().min(1, ADDRESS_ERRORS.ADDRESS_NAME_REQUIRED),
  recipient: z.string().min(1, ADDRESS_ERRORS.RECIPIENT_REQUIRED),
  phone: z
    .string()
    .regex(
      /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/,
      ADDRESS_ERRORS.PHONE_INVALID
    ),
  zip_code: z
    .string()
    .regex(/^\d{5}$/, ADDRESS_ERRORS.POSTAL_CODE_INVALID)
    .optional()
    .default(''),
  address: z.string().min(1, ADDRESS_ERRORS.ADDRESS_REQUIRED),
  detail_address: z.string().optional().default(''),
});

export type UpdateAddressRequest = z.infer<typeof UpdateAddressRequestSchema>;

/**
 * Address message response schema
 * 주소 API의 성공/에러 메시지 검증
 */
export const AddressMessageResponseSchema = z.object({
  message: z.string(),
});

export type AddressMessageResponse = z.infer<typeof AddressMessageResponseSchema>;
