import { z } from 'zod';

/**
 * 매장 관련 에러 메시지
 */
export const STORE_ERRORS = {
  NAME_REQUIRED: '매장명을 입력해주세요',
  NAME_MIN_LENGTH: '매장명은 최소 2자 이상이어야 합니다',
  PHONE_INVALID: '올바른 전화번호 형식이 아닙니다 (예: 010-1234-5678)',
  REGION_REQUIRED: '지역을 선택해주세요',
  DISTRICT_REQUIRED: '구/군을 선택해주세요',
  BUSINESS_NUMBER_REQUIRED: '사업자등록번호를 입력해주세요',
  BUSINESS_START_DATE_REQUIRED: '개업일자를 입력해주세요',
  REPRESENTATIVE_NAME_REQUIRED: '대표자명을 입력해주세요',
} as const;

/**
 * Create store request schema (Store Registration)
 * 매장 등록 사용자 입력 검증
 */
export const StoreRegisterSchema = z.object({
  name: z.string().min(1, STORE_ERRORS.NAME_REQUIRED).min(2, STORE_ERRORS.NAME_MIN_LENGTH),
  region: z.string().min(1, STORE_ERRORS.REGION_REQUIRED),
  district: z.string().min(1, STORE_ERRORS.DISTRICT_REQUIRED),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  phone_number: z
    .string()
    .transform((val) => val === "" ? undefined : val)
    .pipe(
      z
        .string()
        .regex(
          /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/,
          STORE_ERRORS.PHONE_INVALID
        )
        .optional()
    ),
  image_url: z.string().optional(),
  description: z.string().optional(),
  open_time: z.string().optional(),
  close_time: z.string().optional(),
  tag_ids: z.array(z.number()).optional(),
  // 사업자 인증 정보 (필수)
  business_number: z.string().min(1, STORE_ERRORS.BUSINESS_NUMBER_REQUIRED),
  business_start_date: z.string().min(1, STORE_ERRORS.BUSINESS_START_DATE_REQUIRED),
  representative_name: z.string().min(1, STORE_ERRORS.REPRESENTATIVE_NAME_REQUIRED),
});

export type StoreRegisterRequest = z.infer<typeof StoreRegisterSchema>;

/**
 * Update store request schema
 * 매장 정보 업데이트 사용자 입력 검증
 */
export const UpdateStoreRequestSchema = z.object({
  name: z.string().min(2, STORE_ERRORS.NAME_MIN_LENGTH).optional(),
  region: z.string().optional(),
  district: z.string().optional(),
  address: z.string().optional(),
  phone_number: z
    .string()
    .transform((val) => val === "" ? undefined : val)
    .pipe(
      z
        .string()
        .regex(
          /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/,
          STORE_ERRORS.PHONE_INVALID
        )
        .optional()
    ),
  open_time: z.string().optional(),
  close_time: z.string().optional(),
  description: z.string().optional(),
  image_url: z.string().optional(),
  tag_ids: z.array(z.number()).optional(),
});

export type UpdateStoreRequest = z.infer<typeof UpdateStoreRequestSchema>;

/**
 * Update store response schema
 * PUT /users/me/store 엔드포인트 응답 검증
 */
export const UpdateStoreResponseSchema = z.object({
  message: z.string(),
  store: z.object({
    id: z.number(),
    user_id: z.number(),
    name: z.string(),
    region: z.string().optional(),
    district: z.string().optional(),
    address: z.string().optional(),
    phone_number: z.string().optional(),
    business_hours: z.string().optional(),
    description: z.string().optional(),
  }),
});

export type UpdateStoreResponse = z.infer<typeof UpdateStoreResponseSchema>;
