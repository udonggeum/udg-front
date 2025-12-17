"use server";

import axios, { AxiosError } from "axios";
import type { TagsResponse } from "@/types/tags";

const apiClient = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://43.200.249.22:8080'}/api/v1`,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * 태그 목록 조회 Server Action
 */
export async function getTagsAction(category?: string): Promise<{
  success: boolean;
  data?: TagsResponse;
  error?: string;
}> {
  try {
    const response = await apiClient.get<TagsResponse>("/tags", {
      params: category ? { category } : undefined,
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error("Get tags error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "태그 목록 조회에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}
