"use server";

import axios, { AxiosError } from "axios";
import type {
  LatestGoldPricesResponse,
  GoldPriceByTypeResponse,
  GoldPriceHistoryResponse,
  GoldPrice,
  GoldType,
  HistoryPeriod,
} from "@/types/goldPrices";

const apiClient = axios.create({
  baseURL: "http://43.200.249.22:8080/api/v1",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * 최신 금시세 전체 조회 Server Action
 */
export async function getLatestGoldPricesAction(): Promise<{
  success: boolean;
  data?: GoldPrice[];
  error?: string;
}> {
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
    console.error("Get latest gold prices error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "금시세 조회에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}

/**
 * 특정 타입 금시세 조회 Server Action
 */
export async function getGoldPriceByTypeAction(
  type: GoldType
): Promise<{
  success: boolean;
  data?: GoldPrice;
  error?: string;
}> {
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
    console.error("Get gold price by type error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "금시세 조회에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}

/**
 * 금시세 히스토리 조회 Server Action
 */
export async function getGoldPriceHistoryAction(
  type: GoldType,
  period: HistoryPeriod = "1개월"
): Promise<{
  success: boolean;
  data?: GoldPriceHistoryResponse["data"];
  error?: string;
}> {
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
    console.error("Get gold price history error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "금시세 히스토리 조회에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}
