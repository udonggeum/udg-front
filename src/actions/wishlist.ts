"use server";

import axios, { AxiosError } from "axios";
import type {
  WishlistResponse,
  AddToWishlistRequest,
  WishlistMessageResponse,
} from "@/types/wishlist";

const apiClient = axios.create({
  baseURL: "http://43.200.249.22:8080/api/v1",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * 위시리스트 조회 Server Action
 */
export async function getWishlistAction(
  accessToken: string
): Promise<{ success: boolean; data?: WishlistResponse; error?: string }> {
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
    console.error("Get wishlist error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "위시리스트 조회에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}

/**
 * 위시리스트 추가 Server Action
 */
export async function addToWishlistAction(
  data: AddToWishlistRequest,
  accessToken: string
): Promise<{ success: boolean; data?: WishlistMessageResponse; error?: string }> {
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
    console.error("Add to wishlist error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "위시리스트 추가에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}

/**
 * 위시리스트 삭제 Server Action
 */
export async function removeFromWishlistAction(
  productId: number,
  accessToken: string
): Promise<{ success: boolean; data?: WishlistMessageResponse; error?: string }> {
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
    console.error("Remove from wishlist error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "위시리스트 삭제에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}
