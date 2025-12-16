/**
 * 거리 계산 유틸리티
 * Haversine formula를 사용하여 두 지점 간의 거리를 계산
 */

/**
 * 두 좌표 간의 거리를 계산 (Haversine formula)
 *
 * @param lat1 첫 번째 지점의 위도
 * @param lon1 첫 번째 지점의 경도
 * @param lat2 두 번째 지점의 위도
 * @param lon2 두 번째 지점의 경도
 * @returns 거리(km)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // 지구 반지름 (km)

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * 도(degree)를 라디안(radian)으로 변환
 */
function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * 거리를 사람이 읽기 쉬운 문자열로 포맷
 *
 * @param km 거리(km)
 * @returns 포맷된 문자열 (예: "1.2km", "350m")
 */
export function formatDistance(km: number): string {
  if (km < 0.1) {
    // 100m 미만
    return `${Math.round(km * 1000)}m`;
  } else if (km < 1) {
    // 1km 미만
    return `${Math.round(km * 1000)}m`;
  } else if (km < 10) {
    // 10km 미만 - 소수점 첫째자리
    return `${km.toFixed(1)}km`;
  } else {
    // 10km 이상 - 정수
    return `${Math.round(km)}km`;
  }
}

/**
 * 사용자 위치와 매장 간의 거리를 계산하여 포맷된 문자열 반환
 *
 * @param userLat 사용자 위도
 * @param userLon 사용자 경도
 * @param storeLat 매장 위도
 * @param storeLon 매장 경도
 * @returns 포맷된 거리 문자열 또는 null (좌표 없을 경우)
 */
export function getDistanceText(
  userLat?: number,
  userLon?: number,
  storeLat?: number,
  storeLon?: number
): string | null {
  if (
    userLat === undefined ||
    userLon === undefined ||
    storeLat === undefined ||
    storeLon === undefined
  ) {
    return null;
  }

  const distance = calculateDistance(userLat, userLon, storeLat, storeLon);
  return formatDistance(distance);
}
