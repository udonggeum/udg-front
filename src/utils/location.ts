/**
 * 위치 관련 유틸리티 함수
 */

// 역지오코딩 결과 캐시 (30분 유지)
const geocodeCache = new Map<string, { address: string; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30분

/**
 * 카카오 Geocoder로 좌표를 주소로 변환 (역지오코딩)
 *
 * @param lat 위도
 * @param lng 경도
 * @returns 행정구역명 (예: "서울 강남구")
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = geocodeCache.get(key);

  // 캐시 확인
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.address;
  }

  return new Promise((resolve, reject) => {
    // SDK 로드 확인
    if (!window.kakao?.maps?.services) {
      reject(new Error("Kakao Maps SDK가 로드되지 않았습니다."));
      return;
    }

    const geocoder = new kakao.maps.services.Geocoder();

    // Timeout 처리
    const timeoutId = setTimeout(() => {
      reject(new Error("역지오코딩 요청 시간 초과"));
    }, 5000);

    geocoder.coord2Address(lng, lat, (result: any[], status: string) => {
      clearTimeout(timeoutId);

      if (status === kakao.maps.services.Status.OK && result.length > 0) {
        const { region_1depth_name, region_2depth_name } = result[0].address;

        // "서울특별시" → "서울"
        const region1 = region_1depth_name.replace(
          /(특별시|광역시|특별자치시|도|특별자치도)$/,
          ""
        );
        const address = `${region1} ${region_2depth_name}`;

        // 캐시 저장
        geocodeCache.set(key, { address, timestamp: Date.now() });

        resolve(address);
      } else {
        reject(new Error("주소를 찾을 수 없습니다."));
      }
    });
  });
}

/**
 * 주소를 표시용 형식으로 변환
 *
 * @param address 전체 주소
 * @returns 행정구역명 (예: "서울 강남구")
 */
export function formatLocationForDisplay(address: string): string {
  // "서울특별시 강남구 테헤란로 123" → "서울 강남구"
  const match = address.match(
    /(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[^\s]*\s+([^\s]+구|[^\s]+시)/
  );

  if (match) {
    const region1 = match[1];
    const region2 = match[2];
    return `${region1} ${region2}`;
  }

  // 파싱 실패 시 원본 반환
  return address;
}

/**
 * Geolocation API를 Promise로 래핑 (timeout 지원)
 *
 * @param options PositionOptions
 * @returns GeolocationPosition
 */
export function getCurrentPositionWithTimeout(
  options: PositionOptions
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("브라우저에서 위치 정보를 지원하지 않습니다."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}
