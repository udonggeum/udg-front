import { z } from 'zod';
import { ProductSchema } from './products';

/**
 * Wishlist item schema
 * 위시리스트 개별 아이템
 */
export const WishlistItemSchema = z.object({
  id: z.number().int().positive(),
  user_id: z.number().int().positive(),
  product_id: z.number().int().positive(),
  created_at: z.string().datetime(),
  product: ProductSchema.optional(), // 미리 로드된 상품 데이터
});

export type WishlistItem = z.infer<typeof WishlistItemSchema>;

/**
 * Wishlist response schema
 * GET /wishlist 엔드포인트 응답
 */
export const WishlistResponseSchema = z.object({
  wishlist_items: z.array(WishlistItemSchema),
  count: z.number().int().nonnegative(),
});

export type WishlistResponse = z.infer<typeof WishlistResponseSchema>;

/**
 * Add to wishlist request schema
 * 위시리스트 추가 요청
 */
export const AddToWishlistRequestSchema = z.object({
  product_id: z.number().int().positive(),
});

export type AddToWishlistRequest = z.infer<typeof AddToWishlistRequestSchema>;

/**
 * Wishlist message response schema
 * 위시리스트 API 메시지 응답
 */
export const WishlistMessageResponseSchema = z.object({
  message: z.string(),
});

export type WishlistMessageResponse = z.infer<typeof WishlistMessageResponseSchema>;
