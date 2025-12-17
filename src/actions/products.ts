"use server";

import type { ProductsResponse } from "@/types/products";
import { apiClient, handleApiError, type ApiResponse } from "@/lib/axios";

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
): Promise<ApiResponse<ProductsResponse>> {
  try {
    const response = await apiClient.get<ProductsResponse>("/products", { params });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "상품 목록 조회에 실패했습니다.");
  }
}

/**
 * 매장별 상품 목록 조회 Server Action
 */
export async function getStoreProductsAction(
  storeId: number,
  params?: Omit<GetProductsParams, "store_id">
): Promise<ApiResponse<ProductsResponse>> {
  return getProductsAction({ ...params, store_id: storeId });
}
