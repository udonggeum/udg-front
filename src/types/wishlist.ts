import type { Product } from './products';

/**
 * Wishlist item type
 * 위시리스트 아이템
 */
export interface WishlistItem {
  id: number;
  user_id: number;
  product_id: number;
  created_at: string;
  product?: Product;
}

/**
 * Wishlist response type
 * 위시리스트 응답
 */
export interface WishlistResponse {
  wishlist_items: WishlistItem[];
  count: number;
}

/**
 * Add to wishlist request type
 * 위시리스트 추가 요청
 */
export interface AddToWishlistRequest {
  product_id: number;
}

/**
 * Wishlist message response type
 * 위시리스트 메시지 응답
 */
export interface WishlistMessageResponse {
  message: string;
}
