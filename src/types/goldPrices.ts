import { z } from "zod";

// 금 타입
export const GoldTypeSchema = z.enum(["24K", "18K", "14K", "Platinum", "Silver"]);
export type GoldType = z.infer<typeof GoldTypeSchema>;

// 금시세 데이터 (백엔드 응답에 맞게 수정)
export const GoldPriceSchema = z.object({
  type: GoldTypeSchema,
  buy_price: z.number(),
  sell_price: z.number(),
  source: z.string().optional(),
  source_date: z.string().optional(),
  description: z.string().optional(),
  updated_at: z.string(),
  previous_day_price: z.number().optional(),
  change_amount: z.number().optional(),
  change_percent: z.number().optional(),
});

export type GoldPrice = z.infer<typeof GoldPriceSchema>;

// 금시세 히스토리 데이터
export const GoldPriceHistorySchema = z.object({
  date: z.string(),
  buy_price: z.number(),
  sell_price: z.number(),
});

export type GoldPriceHistory = z.infer<typeof GoldPriceHistorySchema>;

// API 응답 타입들 (백엔드가 { success: true, data: ... } 형식으로 반환)
export const LatestGoldPricesResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(GoldPriceSchema),
});

export type LatestGoldPricesResponse = z.infer<typeof LatestGoldPricesResponseSchema>;

export const GoldPriceByTypeResponseSchema = z.object({
  success: z.boolean(),
  data: GoldPriceSchema,
});

export type GoldPriceByTypeResponse = z.infer<typeof GoldPriceByTypeResponseSchema>;

export const GoldPriceHistoryResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(GoldPriceHistorySchema),
});

export type GoldPriceHistoryResponse = z.infer<typeof GoldPriceHistoryResponseSchema>;

// 히스토리 조회 기간 (백엔드가 한글로 받음)
export const HistoryPeriodSchema = z.enum(["1주", "1개월", "3개월", "1년", "전체"]);
export type HistoryPeriod = z.infer<typeof HistoryPeriodSchema>;
