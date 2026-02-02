"use server";

import type {
  StoresResponse,
  StoresRequest,
  LocationsResponse,
  RegionsData,
  StoreDetailResponse,
  StoreLikeResponse,
  StoreRegisterRequest,
  StoreRegisterResponse,
  ClaimStoreRequest,
  ClaimStoreResponse,
  SubmitVerificationRequest,
  SubmitVerificationResponse,
  VerificationStatusResponse,
  StoreRegistrationRequestStatus,
  VerificationsListResponse,
  ReviewVerificationRequest,
} from "@/types/stores";
import type { UpdateStoreRequest } from "@/schemas/stores";
import { apiClient, handleApiError, type ApiResponse } from "@/lib/axios";

/**
 * 매장 목록 조회 Server Action
 */
export async function getStoresAction(
  params?: StoresRequest,
  accessToken?: string
): Promise<ApiResponse<StoresResponse>> {
  try {
    const headers = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : {};

    const response = await apiClient.get<StoresResponse>("/stores", {
      params,
      headers,
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "매장 목록 조회에 실패했습니다.");
  }
}

/**
 * 매장 위치 정보 조회 Server Action
 * 지역(region)과 구/군(district) 목록 반환
 */
export async function getStoreLocationsAction(): Promise<ApiResponse<RegionsData>> {
  try {
    const response = await apiClient.get<LocationsResponse>("/stores/locations");

    // 백엔드 형식을 UI 형식으로 변환
    const regionsMap = new Map<string, Set<string>>();

    response.data.locations.forEach((location) => {
      if (!regionsMap.has(location.region)) {
        regionsMap.set(location.region, new Set());
      }
      regionsMap.get(location.region)!.add(location.district);
    });

    // 배열 형식으로 변환
    const regions = Array.from(regionsMap.entries()).map(([region, districts]) => ({
      region,
      districts: Array.from(districts).sort(),
    }));

    return {
      success: true,
      data: { regions },
    };
  } catch (error) {
    return handleApiError(error, "위치 정보 조회에 실패했습니다.");
  }
}

/**
 * 매장 상세 조회 Server Action
 */
export async function getStoreDetailAction(
  id: number,
  includeProducts?: boolean,
  accessToken?: string
): Promise<ApiResponse<StoreDetailResponse>> {
  try {
    const headers = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : {};

    const response = await apiClient.get<StoreDetailResponse>(`/stores/${id}`, {
      params: { include_products: includeProducts },
      headers,
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "매장 상세 조회에 실패했습니다.");
  }
}

/**
 * 매장 좋아요 토글 Server Action
 */
export async function toggleStoreLikeAction(
  storeId: number,
  accessToken: string
): Promise<ApiResponse<StoreLikeResponse>> {
  try {
    const response = await apiClient.post<StoreLikeResponse>(
      `/stores/${storeId}/like`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "좋아요 처리에 실패했습니다.");
  }
}

/**
 * 사용자가 좋아요한 매장 목록 조회 Server Action
 */
export async function getUserLikedStoresAction(
  accessToken: string
): Promise<ApiResponse<StoresResponse>> {
  try {
    const response = await apiClient.get<StoresResponse>("/users/me/liked-stores", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "관심 매장 목록 조회에 실패했습니다.");
  }
}

/**
 * 내 매장 정보 조회 Server Action (admin 전용)
 */
export async function getMyStoreAction(
  accessToken: string
): Promise<ApiResponse<StoreDetailResponse>> {
  try {
    const response = await apiClient.get<StoreDetailResponse>("/users/me/store", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "내 매장 정보 조회에 실패했습니다.");
  }
}

/**
 * 내 매장 정보 수정 Server Action (admin 전용)
 */
export async function updateMyStoreAction(
  data: UpdateStoreRequest,
  accessToken: string
): Promise<ApiResponse<StoreDetailResponse>> {
  try {
    const response = await apiClient.put<StoreDetailResponse>("/users/me/store", data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "매장 정보 수정에 실패했습니다.");
  }
}

/**
 * 매장 등록 Server Action (사업자 인증 포함)
 */
export async function registerStoreAction(
  data: StoreRegisterRequest,
  accessToken: string
): Promise<ApiResponse<StoreRegisterResponse>> {
  try {
    const response = await apiClient.post<StoreRegisterResponse>("/stores", data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "매장 등록에 실패했습니다.");
  }
}

/**
 * 매장 소유권 신청 (1단계 검증)
 */
export async function claimStoreAction(
  storeId: number,
  data: ClaimStoreRequest,
  accessToken: string
): Promise<ApiResponse<ClaimStoreResponse>> {
  try {
    const response = await apiClient.post<ClaimStoreResponse>(
      `/stores/${storeId}/claim`,
      data,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "매장 소유권 신청에 실패했습니다.");
  }
}

/**
 * 매장 인증 신청 (2단계 검증)
 */
export async function submitVerificationAction(
  data: SubmitVerificationRequest,
  accessToken: string
): Promise<ApiResponse<SubmitVerificationResponse>> {
  try {
    const response = await apiClient.post<SubmitVerificationResponse>(
      "/stores/verification",
      data,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "매장 인증 신청에 실패했습니다.");
  }
}

/**
 * 내 매장 인증 상태 조회
 */
export async function getVerificationStatusAction(
  accessToken: string
): Promise<ApiResponse<VerificationStatusResponse>> {
  try {
    const response = await apiClient.get<VerificationStatusResponse>(
      "/users/me/store/verification",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "인증 상태 조회에 실패했습니다.");
  }
}

/**
 * 매장 등록 요청 상태 조회 Server Action
 */
export async function getStoreRegistrationRequestStatusAction(
  storeId: number,
  accessToken?: string
): Promise<ApiResponse<StoreRegistrationRequestStatus>> {
  try {
    const headers = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : {};

    const response = await apiClient.get<StoreRegistrationRequestStatus>(
      `/stores/${storeId}/registration-request`,
      { headers }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "매장 등록 요청 상태 조회에 실패했습니다.");
  }
}

/**
 * 매장 등록 요청 Server Action
 */
export async function requestStoreRegistrationAction(
  storeId: number,
  accessToken: string
): Promise<ApiResponse<StoreRegistrationRequestStatus>> {
  try {
    const response = await apiClient.post<StoreRegistrationRequestStatus>(
      `/stores/${storeId}/registration-request`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "매장 등록 요청에 실패했습니다.");
  }
}

/**
 * 인증 요청 목록 조회 Server Action (master 전용)
 */
export async function getVerificationsListAction(
  accessToken: string,
  params?: {
    status?: 'pending' | 'approved' | 'rejected';
    page?: number;
    page_size?: number;
  }
): Promise<ApiResponse<VerificationsListResponse>> {
  try {
    const response = await apiClient.get<VerificationsListResponse>(
      "/admin/verifications",
      {
        params,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "인증 요청 목록 조회에 실패했습니다.");
  }
}

/**
 * 인증 요청 승인/거부 Server Action (master 전용)
 */
export async function reviewVerificationAction(
  verificationId: number,
  data: ReviewVerificationRequest,
  accessToken: string
): Promise<ApiResponse<SubmitVerificationResponse>> {
  try {
    const response = await apiClient.put<SubmitVerificationResponse>(
      `/admin/verifications/${verificationId}`,
      data,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "인증 검토 처리에 실패했습니다.");
  }
}
