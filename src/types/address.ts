/**
 * Address type
 * 주소 정보
 */
export interface Address {
  id: number;
  user_id: number;
  name: string;
  recipient: string;
  phone: string;
  zip_code?: string;
  address: string;
  detail_address?: string;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Addresses response type
 * 주소 목록 응답
 */
export interface AddressesResponse {
  addresses: Address[];
}

/**
 * Add address request type
 * 주소 추가 요청
 */
export interface AddToAddressRequest {
  name: string;
  recipient: string;
  phone: string;
  zip_code?: string;
  address: string;
  detail_address?: string;
  is_default?: boolean;
}

/**
 * Update address request type
 * 주소 수정 요청
 */
export interface UpdateAddressRequest {
  name: string;
  recipient: string;
  phone: string;
  zip_code?: string;
  address: string;
  detail_address?: string;
}

/**
 * Address message response type
 * 주소 API 메시지 응답
 */
export interface AddressMessageResponse {
  message: string;
}
