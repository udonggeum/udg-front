"use server";

import type { TagsResponse } from "@/types/tags";
import { apiClient, handleApiError, type ApiResponse } from "@/lib/axios";

/**
 * 태그 목록 조회 Server Action
 */
export async function getTagsAction(category?: string): Promise<ApiResponse<TagsResponse>> {
  try {
    const response = await apiClient.get<TagsResponse>("/tags", {
      params: category ? { category } : undefined,
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "태그 목록 조회에 실패했습니다.");
  }
}
