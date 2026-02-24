/**
 * API 설정 유틸리티
 */

export const getApiBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_API_BASE_URL 환경변수가 설정되지 않았습니다. .env.local 파일을 확인하세요.'
    );
  }
  return url;
};

export const API_BASE_URL = getApiBaseUrl();
