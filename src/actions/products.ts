"use server";

import axios, { AxiosError } from "axios";
import type { ProductsResponse } from "@/types/products";

const apiClient = axios.create({
  baseURL: "http://43.200.249.22:8080/api/v1",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface GetProductsParams {
  store_id?: number;
  category?: string;
  material?: string;
  page?: number;
  page_size?: number;
  include_options?: boolean;
}

/**
 * 상품 목록 조회 Server Action
 */
export async function getProductsAction(
  params?: GetProductsParams
): Promise<{ success: boolean; data?: ProductsResponse; error?: string }> {
  try {
    const response = await apiClient.get<ProductsResponse>("/products", { params });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error("Get products error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "상품 목록 조회에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}

/**
 * 매장별 상품 목록 조회 Server Action
 */
export async function getStoreProductsAction(
  storeId: number,
  params?: Omit<GetProductsParams, "store_id">
): Promise<{ success: boolean; data?: ProductsResponse; error?: string }> {
  return getProductsAction({ ...params, store_id: storeId });
}
