"use server";

import axios, { AxiosError } from "axios";
import type { PresignedUrlRequest, PresignedUrlResponse } from "@/types/upload";

const apiClient = axios.create({
  baseURL: "http://43.200.249.22:8080/api/v1",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * S3 업로드용 Presigned URL 생성
 */
export async function getPresignedUrlAction(
  data: PresignedUrlRequest,
  accessToken: string
): Promise<{ success: boolean; data?: PresignedUrlResponse; error?: string }> {
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
    console.error("Get presigned URL error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "Presigned URL 생성에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
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
