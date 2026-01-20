/**
 * JWT 토큰 유틸리티 함수
 */

interface JWTPayload {
  user_id: number;
  email: string;
  role: string;
  exp: number; // 만료 시간 (Unix timestamp, 초 단위)
  iat: number; // 발급 시간 (Unix timestamp, 초 단위)
}

/**
 * JWT 토큰을 디코딩하여 payload를 반환
 * @param token - JWT 토큰 문자열
 * @returns JWTPayload 또는 null (디코딩 실패 시)
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    // JWT는 "header.payload.signature" 형식
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('[JWT] Invalid token format');
      return null;
    }

    // payload는 base64url 인코딩되어 있음
    const payload = parts[1];

    // base64url을 base64로 변환 (- → +, _ → /, padding 추가)
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');

    // base64 디코딩 후 JSON 파싱
    const decodedPayload = JSON.parse(atob(paddedBase64));

    return decodedPayload as JWTPayload;
  } catch (error) {
    console.error('[JWT] Failed to decode token:', error);
    return null;
  }
}

/**
 * 토큰의 만료 시간을 밀리초 단위로 반환
 * @param token - JWT 토큰 문자열
 * @returns 만료 시간 (밀리초) 또는 null
 */
export function getTokenExpiry(token: string): number | null {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return null;
  }

  // exp는 초 단위이므로 밀리초로 변환
  return payload.exp * 1000;
}

/**
 * 토큰이 만료되었는지 확인
 * @param token - JWT 토큰 문자열
 * @returns 만료 여부
 */
export function isTokenExpired(token: string): boolean {
  const expiry = getTokenExpiry(token);
  if (!expiry) {
    return true;
  }

  return Date.now() >= expiry;
}

/**
 * 토큰이 곧 만료될지 확인 (기본: 5분 이내)
 * @param token - JWT 토큰 문자열
 * @param thresholdMs - 만료 임박 기준 (밀리초), 기본 5분
 * @returns 만료 임박 여부
 */
export function isTokenExpiringSoon(token: string, thresholdMs: number = 5 * 60 * 1000): boolean {
  const expiry = getTokenExpiry(token);
  if (!expiry) {
    return true;
  }

  const timeUntilExpiry = expiry - Date.now();
  return timeUntilExpiry <= thresholdMs && timeUntilExpiry > 0;
}

/**
 * 토큰 만료까지 남은 시간 (밀리초)
 * @param token - JWT 토큰 문자열
 * @returns 남은 시간 (밀리초) 또는 null
 */
export function getTimeUntilExpiry(token: string): number | null {
  const expiry = getTokenExpiry(token);
  if (!expiry) {
    return null;
  }

  return Math.max(0, expiry - Date.now());
}
