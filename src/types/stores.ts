/**
 * Store category counter type
 * 카테고리별 상품 개수
 */
export interface StoreCategoryCounter {
  category?: string;
  name?: string;
  key?: string;
  code?: string;
  count?: number;
  total?: number;
}

export type StoreCategoryCounts = Record<string, number> | StoreCategoryCounter[];

/**
 * Tag type
 * 매장 태그
 */
export interface Tag {
  id: number;
  name: string;
  category: string;
  created_at: string;
  updated_at: string;
}

/**
 * Store detail type
 * 매장 상세 정보
 */
export interface StoreDetail {
  id: number;
  name: string;
  region?: string;
  district?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  phone_number?: string;
  open_time?: string;
  close_time?: string;
  business_hours?: string;
  description?: string;
  tags?: Tag[];
  product_count?: number;
  total_products?: number;
  image_url?: string;
  logo_url?: string;
  thumbnail_url?: string;
  category_counts?: StoreCategoryCounts;
  products?: unknown[];
}

/**
 * Stores response type
 * 매장 목록 응답
 */
export interface StoresResponse {
  count: number;
  stores: StoreDetail[];
  category_store_counts?: Record<string, number>;
  category_counts?: Record<string, number>;
}

/**
 * Store location type
 * 매장 위치 정보
 */
export interface StoreLocation {
  region: string;
  district: string;
  store_count: number;
}

/**
 * Locations response type
 * 위치 목록 응답
 */
export interface LocationsResponse {
  count: number;
  locations: StoreLocation[];
}

/**
 * Regions data type (transformed)
 * UI용 지역 데이터
 */
export interface RegionsData {
  regions: Array<{
    region: string;
    districts: string[];
  }>;
}

/**
 * Stores request params type
 * 매장 목록 요청 파라미터
 */
export interface StoresRequest {
  region?: string;
  district?: string;
  category?: string;
  page?: number;
  page_size?: number;
}

/**
 * Store detail response type
 * 매장 상세 응답
 */
export interface StoreDetailResponse {
  store: StoreDetail;
}
