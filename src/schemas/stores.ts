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
} as const;

/**
 * Update store request schema
 * 매장 정보 업데이트 사용자 입력 검증
 */
export const UpdateStoreRequestSchema = z.object({
  name: z.string().min(2, STORE_ERRORS.NAME_MIN_LENGTH),
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
