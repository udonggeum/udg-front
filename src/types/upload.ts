/**
 * Presigned URL request type
 * S3 업로드용 Presigned URL 요청
 */
export interface PresignedUrlRequest {
  filename: string;
  content_type: string;
  file_size: number;
}

/**
 * Presigned URL response type
 * S3 업로드용 Presigned URL 응답
 */
export interface PresignedUrlResponse {
  upload_url: string; // S3에 직접 업로드할 URL
  file_url: string;   // 업로드 완료 후 접근 가능한 CDN URL
  key: string;        // S3 객체 키
}
