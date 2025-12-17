"use server";

import type {
  AddressesResponse,
  AddToAddressRequest,
  UpdateAddressRequest,
  AddressMessageResponse,
} from "@/types/address";
import { apiClient, handleApiError, type ApiResponse } from "@/lib/axios";

/**
 * 주소 목록 조회 Server Action
 */
export async function getAddressesAction(
  accessToken: string
): Promise<ApiResponse<AddressesResponse>> {
  try {
    const response = await apiClient.get<AddressesResponse>("/addresses", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "주소 목록 조회에 실패했습니다.");
  }
}

/**
 * 주소 추가 Server Action
 */
export async function addAddressAction(
  data: AddToAddressRequest,
  accessToken: string
): Promise<ApiResponse<AddressMessageResponse>> {
  try {
    const response = await apiClient.post<AddressMessageResponse>("/addresses", data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "주소 추가에 실패했습니다.");
  }
}

/**
 * 주소 수정 Server Action
 */
export async function updateAddressAction(
  id: number,
  data: UpdateAddressRequest,
  accessToken: string
): Promise<ApiResponse<AddressMessageResponse>> {
  try {
    const response = await apiClient.put<AddressMessageResponse>(`/addresses/${id}`, data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "주소 수정에 실패했습니다.");
  }
}

/**
 * 주소 삭제 Server Action
 */
export async function deleteAddressAction(
  id: number,
  accessToken: string
): Promise<ApiResponse<AddressMessageResponse>> {
  try {
    const response = await apiClient.delete<AddressMessageResponse>(`/addresses/${id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "주소 삭제에 실패했습니다.");
  }
}

/**
 * 기본 주소 설정 Server Action
 */
export async function setDefaultAddressAction(
  id: number,
  accessToken: string
): Promise<ApiResponse<AddressMessageResponse>> {
  try {
    const response = await apiClient.patch<AddressMessageResponse>(
      `/addresses/${id}/default`,
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
    return handleApiError(error, "기본 주소 설정에 실패했습니다.");
  }
}
