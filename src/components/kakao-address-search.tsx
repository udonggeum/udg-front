"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DaumPostcodeData } from "@/types/kakao";

// Kakao 주소 검색 결과 타입
interface KakaoAddress {
  address: string;          // 전체 주소
  roadAddress?: string;     // 도로명 주소
  jibunAddress?: string;    // 지번 주소
  zonecode: string;         // 우편번호
  sido: string;             // 시/도
  sigungu: string;          // 구/군
  bname?: string;           // 법정동/법정리 이름
  latitude?: number;        // 위도 (좌표)
  longitude?: number;       // 경도 (좌표)
}

interface KakaoAddressSearchProps {
  onSelect: (address: KakaoAddress) => void;
  placeholder?: string;
  buttonText?: string;
}

export default function KakaoAddressSearch({
  onSelect,
  placeholder = "주소를 검색하세요",
  buttonText = "주소 검색",
}: KakaoAddressSearchProps) {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  // 카카오 우편번호 스크립트 로드
  useEffect(() => {
    const loadKakaoScript = () => {
      // 이미 로드되었는지 확인
      if (window.daum?.Postcode) {
        setIsScriptLoaded(true);
        return;
      }

      // 스크립트 태그 생성 및 로드
      const script = document.createElement("script");
      script.src =
        "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
      script.async = true;
      script.onload = () => {
        setIsScriptLoaded(true);
      };
      script.onerror = () => {
        console.error("Failed to load Kakao Postcode script");
      };
      document.head.appendChild(script);
    };

    loadKakaoScript();
  }, []);

  // 카카오 지도 API 스크립트 로드 (좌표 변환용)
  useEffect(() => {
    const loadKakaoMapsScript = () => {
      if (window.kakao?.maps) {
        return;
      }

      const script = document.createElement("script");
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&libraries=services&autoload=false`;
      script.async = true;
      script.onload = () => {
        if (window.kakao?.maps) {
          window.kakao.maps.load(() => {
            console.log("Kakao Maps API loaded");
          });
        }
      };
      document.head.appendChild(script);
    };

    loadKakaoMapsScript();
  }, []);

  // 주소 → 좌표 변환
  const getCoordinates = async (
    address: string
  ): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      if (!window.kakao?.maps) {
        resolve(null);
        return;
      }

      const geocoder = new window.kakao.maps.services.Geocoder();

      geocoder.addressSearch(address, (result: any, status: any) => {
        if (status === window.kakao!.maps.services.Status.OK && result[0]) {
          resolve({
            latitude: parseFloat(result[0].y),
            longitude: parseFloat(result[0].x),
          });
        } else {
          resolve(null);
        }
      });
    });
  };

  // 주소 검색 모달 열기
  const handleSearchClick = () => {
    if (!isScriptLoaded || !window.daum?.Postcode) {
      alert("주소 검색 기능을 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    new window.daum.Postcode({
      oncomplete: async (data: DaumPostcodeData) => {
        // 도로명 주소 우선, 없으면 지번 주소
        const fullAddress = data.roadAddress || data.jibunAddress;

        // 좌표 가져오기
        const coordinates = await getCoordinates(fullAddress);

        // sido, sigungu 정보 추출 (address에서)
        const addressParts = data.address.split(" ");
        const sido = addressParts[0] || "";
        const sigungu = addressParts[1] || "";

        const addressData: KakaoAddress = {
          address: fullAddress,
          roadAddress: data.roadAddress,
          jibunAddress: data.jibunAddress,
          zonecode: data.zonecode,
          sido: sido,
          sigungu: sigungu,
          bname: data.bname,
          latitude: coordinates?.latitude,
          longitude: coordinates?.longitude,
        };

        onSelect(addressData);
      },
    }).open();
  };

  return (
    <div className="flex gap-2">
      <Input
        type="text"
        placeholder={placeholder}
        readOnly
        className="flex-1 cursor-pointer bg-gray-50"
        onClick={handleSearchClick}
      />
      <Button
        type="button"
        onClick={handleSearchClick}
        disabled={!isScriptLoaded}
        variant="outline"
        className="flex items-center gap-2"
      >
        <Search className="w-4 h-4" />
        {buttonText}
      </Button>
    </div>
  );
}
