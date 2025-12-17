/**
 * API 설정 유틸리티
 */

export const getApiBaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://43.200.249.22:8080';
};

export const API_BASE_URL = getApiBaseUrl();
