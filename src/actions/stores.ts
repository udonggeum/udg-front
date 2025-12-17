"use server";

import type {
  StoresResponse,
  StoresRequest,
  LocationsResponse,
  RegionsData,
  StoreDetailResponse,
  StoreLikeResponse,
} from "@/types/stores";
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
