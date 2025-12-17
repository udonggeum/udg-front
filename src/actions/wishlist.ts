"use server";

import type {
  WishlistResponse,
  AddToWishlistRequest,
  WishlistMessageResponse,
} from "@/types/wishlist";
import { apiClient, handleApiError, type ApiResponse } from "@/lib/axios";

/**
 * 위시리스트 조회 Server Action
 */
export async function getWishlistAction(
  accessToken: string
): Promise<ApiResponse<WishlistResponse>> {
  try {
    const response = await apiClient.get<WishlistResponse>("/wishlist", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "위시리스트 조회에 실패했습니다.");
  }
}

/**
 * 위시리스트 추가 Server Action
 */
export async function addToWishlistAction(
  data: AddToWishlistRequest,
  accessToken: string
): Promise<ApiResponse<WishlistMessageResponse>> {
  try {
    const response = await apiClient.post<WishlistMessageResponse>("/wishlist", data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "위시리스트 추가에 실패했습니다.");
  }
}

/**
 * 위시리스트 삭제 Server Action
 */
export async function removeFromWishlistAction(
  productId: number,
  accessToken: string
): Promise<ApiResponse<WishlistMessageResponse>> {
  try {
    const response = await apiClient.delete<WishlistMessageResponse>(`/wishlist/${productId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "위시리스트 삭제에 실패했습니다.");
  }
}
