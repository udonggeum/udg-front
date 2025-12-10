import { z } from 'zod';

/**
 * Store schema
 * 상품에 포함된 매장 정보
 */
export const StoreSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  region: z.string().optional(),
  district: z.string().optional(),
  address: z.string().optional().nullable(),
  phone_number: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  open_time: z.string().optional().nullable(),
  close_time: z.string().optional().nullable(),
});

export type Store = z.infer<typeof StoreSchema>;

/**
 * Product option schema
 * 상품 옵션/변형 (예: 사이즈, 색상)
 */
export const ProductOptionSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  value: z.string(),
  additional_price: z.number().nonnegative().default(0),
  stock_quantity: z.number().int().nonnegative().default(0),
  is_default: z.boolean().default(false),
});

export type ProductOption = z.infer<typeof ProductOptionSchema>;

/**
 * Product schema
 * 완전한 상품 정보
 */
export const ProductSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  price: z.number().nonnegative(),
  category: z.string().min(1),
  material: z.string().min(1).optional(),
  stock_quantity: z.number().int().nonnegative().default(0),
  popularity_score: z.number().nonnegative().default(0),
  wishlist_count: z.number().int().nonnegative().default(0),
  view_count: z.number().int().nonnegative().default(0),
  description: z.string().optional(),
  weight: z.number().nonnegative().optional(),
  purity: z.string().optional(),
  image_url: z.string().regex(/^(https?:\/\/.+|\/uploads\/.+)$/).optional().or(z.literal('')).optional(),
  store_id: z.number().int().positive().optional(),
  store: StoreSchema.optional(),
  options: z.array(ProductOptionSchema).optional(),
});

export type Product = z.infer<typeof ProductSchema>;

/**
 * Products response schema
 * GET /products 엔드포인트 응답 (페이지네이션)
 */
export const ProductsResponseSchema = z.object({
  count: z.number().int().nonnegative(),
  page_size: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  products: z.array(ProductSchema),
});

export type ProductsResponse = z.infer<typeof ProductsResponseSchema>;
