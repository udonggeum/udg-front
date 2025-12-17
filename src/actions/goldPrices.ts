"use server";

import type {
  LatestGoldPricesResponse,
  GoldPriceByTypeResponse,
  GoldPriceHistoryResponse,
  GoldPrice,
  GoldType,
  HistoryPeriod,
} from "@/types/goldPrices";
import { apiClient, handleApiError, type ApiResponse } from "@/lib/axios";

/**
 * 최신 금시세 전체 조회 Server Action
 */
export async function getLatestGoldPricesAction(): Promise<ApiResponse<GoldPrice[]>> {
  try {
    const response = await apiClient.get<LatestGoldPricesResponse>("/gold-prices/latest");

    // API가 { success: true, data: [...] } 형식으로 반환
    if (response.data.success && response.data.data) {
      return {
        success: true,
        data: response.data.data,
      };
    }

    return {
      success: false,
      error: "금시세 데이터가 없습니다.",
    };
  } catch (error) {
    return handleApiError(error, "금시세 조회에 실패했습니다.");
  }
}

/**
 * 특정 타입 금시세 조회 Server Action
 */
export async function getGoldPriceByTypeAction(
  type: GoldType
): Promise<ApiResponse<GoldPrice>> {
  try {
    const response = await apiClient.get<GoldPriceByTypeResponse>(
      `/gold-prices/type/${type}`
    );

    // API가 { success: true, data: {...} } 형식으로 반환
    if (response.data.success && response.data.data) {
      return {
        success: true,
        data: response.data.data,
      };
    }

    return {
      success: false,
      error: "금시세 데이터가 없습니다.",
    };
  } catch (error) {
    return handleApiError(error, "금시세 조회에 실패했습니다.");
  }
}

/**
 * 금시세 히스토리 조회 Server Action
 */
export async function getGoldPriceHistoryAction(
  type: GoldType,
  period: HistoryPeriod = "1개월"
): Promise<ApiResponse<GoldPriceHistoryResponse["data"]>> {
  try {
    const response = await apiClient.get<GoldPriceHistoryResponse>(
      `/gold-prices/history/${type}`,
      {
        params: { period },
      }
    );

    // API가 { success: true, data: [...] } 형식으로 반환
    if (response.data.success && response.data.data) {
      return {
        success: true,
        data: response.data.data,
      };
    }

    return {
      success: false,
      error: "금시세 히스토리 데이터가 없습니다.",
    };
  } catch (error) {
    return handleApiError(error, "금시세 히스토리 조회에 실패했습니다.");
  }
}
