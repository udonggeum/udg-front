"use server";

import axios, { AxiosError } from "axios";
import type {
  AddressesResponse,
  AddToAddressRequest,
  UpdateAddressRequest,
  AddressMessageResponse,
} from "@/types/address";

const apiClient = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://43.200.249.22:8080'}/api/v1`,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * 주소 목록 조회 Server Action
 */
export async function getAddressesAction(
  accessToken: string
): Promise<{ success: boolean; data?: AddressesResponse; error?: string }> {
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
    console.error("Get addresses error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "주소 목록 조회에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}

/**
 * 주소 추가 Server Action
 */
export async function addAddressAction(
  data: AddToAddressRequest,
  accessToken: string
): Promise<{ success: boolean; data?: AddressMessageResponse; error?: string }> {
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
    console.error("Add address error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "주소 추가에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}

/**
 * 주소 수정 Server Action
 */
export async function updateAddressAction(
  id: number,
  data: UpdateAddressRequest,
  accessToken: string
): Promise<{ success: boolean; data?: AddressMessageResponse; error?: string }> {
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
    console.error("Update address error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "주소 수정에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}

/**
 * 주소 삭제 Server Action
 */
export async function deleteAddressAction(
  id: number,
  accessToken: string
): Promise<{ success: boolean; data?: AddressMessageResponse; error?: string }> {
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
    console.error("Delete address error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "주소 삭제에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}

/**
 * 기본 주소 설정 Server Action
 */
export async function setDefaultAddressAction(
  id: number,
  accessToken: string
): Promise<{ success: boolean; data?: AddressMessageResponse; error?: string }> {
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
    console.error("Set default address error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "기본 주소 설정에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}
