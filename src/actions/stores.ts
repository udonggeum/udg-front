"use server";

import axios, { AxiosError } from "axios";
import type {
  StoresResponse,
  StoresRequest,
  LocationsResponse,
  RegionsData,
  StoreDetailResponse,
} from "@/types/stores";

const apiClient = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://43.200.249.22:8080'}/api/v1`,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * 매장 목록 조회 Server Action
 */
export async function getStoresAction(
  params?: StoresRequest
): Promise<{ success: boolean; data?: StoresResponse; error?: string }> {
  try {
    const response = await apiClient.get<StoresResponse>("/stores", { params });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error("Get stores error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "매장 목록 조회에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}

/**
 * 매장 위치 정보 조회 Server Action
 * 지역(region)과 구/군(district) 목록 반환
 */
export async function getStoreLocationsAction(): Promise<{
  success: boolean;
  data?: RegionsData;
  error?: string;
}> {
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
    console.error("Get store locations error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "위치 정보 조회에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}

/**
 * 매장 상세 조회 Server Action
 */
export async function getStoreDetailAction(
  id: number,
  includeProducts?: boolean
): Promise<{ success: boolean; data?: StoreDetailResponse; error?: string }> {
  try {
    const response = await apiClient.get<StoreDetailResponse>(`/stores/${id}`, {
      params: { include_products: includeProducts },
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error("Get store detail error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "매장 상세 조회에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}
