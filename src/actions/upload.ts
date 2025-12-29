"use server";

import { apiClient, handleApiError, type ApiResponse } from "@/lib/axios";

/**
 * Presigned URL 응답 타입
 */
export interface PresignedURLResponse {
  upload_url: string;
  file_url: string;
  key: string;
}

/**
 * Presigned URL 요청 타입
 */
export interface GeneratePresignedURLRequest {
  filename: string;
  content_type: string;
  file_size: number;
  folder?: string;
}

/**
 * Presigned URL 생성
 */
export async function generatePresignedURLAction(
  data: GeneratePresignedURLRequest,
  accessToken: string
): Promise<ApiResponse<PresignedURLResponse>> {
  try {
    const response = await apiClient.post<PresignedURLResponse>(
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
    return handleApiError(error, "업로드 URL 생성에 실패했습니다.");
  }
}

/**
 * S3에 직접 파일 업로드
 */
export async function uploadFileToS3(
  uploadUrl: string,
  file: File
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return { success: true };
  } catch (error) {
    console.error("S3 upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "파일 업로드에 실패했습니다.",
    };
  }
}

// 기존 코드 호환성을 위한 alias
export const getPresignedUrlAction = generatePresignedURLAction;
export const uploadToS3 = uploadFileToS3;
