/**
 * 카카오 Maps API 및 Postcode API 타입 선언
 */

declare global {
  interface Window {
    kakao: any;
    daum: {
      Postcode: new (options: DaumPostcodeOptions) => DaumPostcodeInstance;
    };
  }
}

/**
 * Daum Postcode API
 */
export interface DaumPostcodeData {
  zonecode: string; // 우편번호
  address: string; // 기본 주소
  addressEnglish: string; // 영문 주소
  addressType: "R" | "J"; // 도로명(R), 지번(J)
  userSelectedType: "R" | "J"; // 사용자가 선택한 주소 타입
  roadAddress: string; // 도로명 주소
  jibunAddress: string; // 지번 주소
  bname: string; // 법정동/법정리 이름
  buildingName: string; // 건물명
  apartment: "Y" | "N"; // 아파트 여부
  autoRoadAddress: string; // 도로명 주소 (자동)
  autoJibunAddress: string; // 지번 주소 (자동)
}

export interface DaumPostcodeOptions {
  oncomplete?: (data: DaumPostcodeData) => void;
  onclose?: () => void;
  onsearch?: (data: { q: string; count: number }) => void;
  onresize?: (size: { width: number; height: number }) => void;
  width?: number | string;
  height?: number | string;
  animation?: boolean;
  theme?: {
    bgColor?: string;
    searchBgColor?: string;
    contentBgColor?: string;
    pageBgColor?: string;
    textColor?: string;
    queryTextColor?: string;
    postcodeTextColor?: string;
    emphTextColor?: string;
    outlineColor?: string;
  };
}

export interface DaumPostcodeInstance {
  open: () => void;
  embed: (element: HTMLElement) => void;
}

/**
 * Kakao Geocoder API
 */
export interface KakaoGeocoderResult {
  address: {
    address_name: string;
    region_1depth_name: string; // 시/도
    region_2depth_name: string; // 구/군
    region_3depth_name: string; // 동/읍/면
    mountain_yn: "Y" | "N";
    main_address_no: string;
    sub_address_no: string;
    zip_code?: string;
  };
  road_address: {
    address_name: string;
    region_1depth_name: string;
    region_2depth_name: string;
    region_3depth_name: string;
    road_name: string;
    underground_yn: "Y" | "N";
    main_building_no: string;
    sub_building_no: string;
    building_name: string;
    zone_no: string;
  } | null;
}

export enum KakaoStatus {
  OK = "OK",
  ZERO_RESULT = "ZERO_RESULT",
  ERROR = "ERROR",
}

export {};
