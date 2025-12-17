"use server";

import axios from "axios";
import type { PresignedUrlRequest, PresignedUrlResponse } from "@/types/upload";
import { apiClient, handleApiError, type ApiResponse } from "@/lib/axios";

/**
 * S3 업로드용 Presigned URL 생성
 */
export async function getPresignedUrlAction(
  data: PresignedUrlRequest,
  accessToken: string
): Promise<ApiResponse<PresignedUrlResponse>> {
  try {
    const response = await apiClient.post<PresignedUrlResponse>(
      "/upload/presigned-url",
      data,
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
    return handleApiError(error, "Presigned URL 생성에 실패했습니다.");
  }
}

/**
 * S3에 파일 직접 업로드 (클라이언트 사이드에서 사용)
 */
export async function uploadToS3(
  uploadUrl: string,
  file: File
): Promise<{ success: boolean; error?: string }> {
  try {
    await axios.put(uploadUrl, file, {
      headers: {
        "Content-Type": file.type,
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("S3 upload error:", error);

    return {
      success: false,
      error: "파일 업로드에 실패했습니다.",
    };
  }
}
