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
  user_id?: number;
  name: string;
  branch_name?: string; // 지점명
  slug: string; // URL용 고유 식별자 (SEO)
  region?: string;
  district?: string;
  dong?: string; // 행정동명
  address?: string;
  building_name?: string; // 건물명
  floor?: string; // 층정보
  unit?: string; // 호정보
  postal_code?: string; // 우편번호
  latitude?: number;
  longitude?: number;
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
  is_liked?: boolean;

  // 2단계 검증 시스템
  is_managed?: boolean; // 관리매장 여부 (소유자가 있는 매장)
  is_verified?: boolean; // 인증 매장 여부 (사업자등록증 검증 완료)
  verified_at?: string; // 인증 완료 일시
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
  user_lat?: number; // 사용자 위도 (거리순 정렬용)
  user_lng?: number; // 사용자 경도 (거리순 정렬용)
}

/**
 * Store detail response type
 * 매장 상세 응답
 */
export interface StoreDetailResponse {
  store: StoreDetail;
  is_liked?: boolean;
  average_rating?: number;
  review_count?: number;
}

/**
 * Store like response type
 * 매장 좋아요 응답
 */
export interface StoreLikeResponse {
  is_liked: boolean;
}

/**
 * Store register request type
 * 매장 등록 요청 (사업자 인증 포함)
 */
export interface StoreRegisterRequest {
  // 사업자 정보 (필수)
  business_number: string;        // 사업자등록번호 (10자리, 하이픈 제외)
  business_start_date: string;    // 개업일자 (YYYYMMDD)
  representative_name: string;    // 대표자명

  // 매장 기본 정보 (필수)
  name: string;                   // 매장명
  region: string;                 // 시/도
  district: string;               // 구/군
  address: string;                // 상세 주소
  phone_number: string;           // 전화번호

  // 위치 정보 (선택 - 주소 검색으로 자동 입력)
  latitude?: number;              // 위도
  longitude?: number;             // 경도

  // 매장 상세 정보 (선택)
  image_url?: string;             // 매장 이미지 URL
  description?: string;           // 매장 소개
  open_time?: string;             // 오픈 시간 (예: "09:00")
  close_time?: string;            // 마감 시간 (예: "20:00")
  tag_ids?: number[];             // 매장 태그 ID 배열
}

/**
 * Store register response type
 * 매장 등록 응답
 */
export interface StoreRegisterResponse {
  message: string;
  store: StoreDetail;
}

/**
 * Claim store request type
 * 매장 소유권 신청 요청
 */
export interface ClaimStoreRequest {
  business_number: string;      // 사업자등록번호 (10자리, 하이픈 제외)
  business_start_date: string;  // 개업일자 (YYYYMMDD)
  representative_name: string;  // 대표자명
}

/**
 * Claim store response type
 * 매장 소유권 신청 응답
 */
export interface ClaimStoreResponse {
  message: string;
  store: StoreDetail;
  is_verified: boolean;
}

/**
 * Store verification type
 * 매장 인증 정보
 */
export interface StoreVerification {
  id: number;
  store_id: number;
  business_license_url: string;  // 사업자등록증 이미지 URL
  status: 'pending' | 'approved' | 'rejected';  // 인증 상태
  submitted_at?: string;         // 제출 일시
  reviewed_at?: string;          // 검토 완료 일시
  reviewed_by?: number;          // 검토한 관리자 ID
  rejection_reason?: string;     // 반려 사유
  created_at: string;
  updated_at: string;
}

/**
 * Submit verification request type
 * 매장 인증 신청 요청
 */
export interface SubmitVerificationRequest {
  business_license_url: string;  // S3에 업로드된 사업자등록증 URL
}

/**
 * Submit verification response type
 * 매장 인증 신청 응답
 */
export interface SubmitVerificationResponse {
  message: string;
  verification: StoreVerification;
  status: string;
}

/**
 * Verification status response type
 * 인증 상태 조회 응답
 */
export interface VerificationStatusResponse {
  is_verified: boolean;
  verification: StoreVerification | null;
}
