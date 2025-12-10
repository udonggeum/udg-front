/**
 * Store type
 * 매장 정보
 */
export interface Store {
  id: number;
  name: string;
  region?: string;
  district?: string;
  address?: string | null;
  phone_number?: string | null;
  image_url?: string | null;
  description?: string | null;
  open_time?: string | null;
  close_time?: string | null;
}

/**
 * Product option type
 * 상품 옵션
 */
export interface ProductOption {
  id: number;
  name: string;
  value: string;
  additional_price: number;
  stock_quantity: number;
  is_default: boolean;
}

/**
 * Product type
 * 상품 정보
 */
export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  material?: string;
  stock_quantity: number;
  popularity_score: number;
  wishlist_count: number;
  view_count: number;
  description?: string;
  weight?: number;
  purity?: string;
  image_url?: string;
  store_id?: number;
  store?: Store;
  options?: ProductOption[];
}

/**
 * Products response type
 * 상품 목록 응답
 */
export interface ProductsResponse {
  count: number;
  page_size: number;
  offset: number;
  products: Product[];
}
