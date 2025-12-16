"use client";

import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocationStore } from "@/stores/useLocationStore";
import {
  reverseGeocode,
  getCurrentPositionWithTimeout,
  formatLocationForDisplay,
} from "@/utils/location";
import { toast } from "sonner";

interface LocationSettingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LocationSettingModal({
  isOpen,
  onClose,
}: LocationSettingModalProps) {
  const { currentLocation, setLocationFromGPS, setLocationFromAddress } =
    useLocationStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGPSLocation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Geolocation API로 현재 위치 획득
      const position = await getCurrentPositionWithTimeout({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });

      const { latitude, longitude } = position.coords;

      // 2. 카카오 Geocoder로 역지오코딩
      const address = await reverseGeocode(latitude, longitude);

      // 3. Store 업데이트
      setLocationFromGPS(latitude, longitude, address);

      toast.success(`현재 위치가 "${address}"로 설정되었습니다.`);
      onClose();
    } catch (err: any) {
      console.error("GPS location error:", err);

      if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
        const confirmed = window.confirm(
          "위치 권한이 필요합니다. 주소 검색으로 대체하시겠습니까?"
        );
        if (confirmed) {
          handleAddressSearch();
        }
      } else if (err.code === GeolocationPositionError.TIMEOUT) {
        setError("위치 정보를 가져오는 데 시간이 초과되었습니다.");
      } else if (err.message?.includes("Kakao Maps SDK")) {
        setError("지도 SDK를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      } else {
        setError("위치 정보를 가져올 수 없습니다.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddressSearch = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Postcode 스크립트 로드
      await loadPostcodeScript();

      new window.daum.Postcode({
        oncomplete: async (data: any) => {
          const fullAddress = data.address;
          const displayAddress = formatLocationForDisplay(fullAddress);

          // Geocoder로 좌표 변환 (optional)
          try {
            if (window.kakao?.maps?.services) {
              const geocoder = new kakao.maps.services.Geocoder();
              geocoder.addressSearch(
                fullAddress,
                (result: any[], status: string) => {
                  if (
                    status === kakao.maps.services.Status.OK &&
                    result.length > 0
                  ) {
                    const lat = parseFloat(result[0].y);
                    const lng = parseFloat(result[0].x);
                    setLocationFromAddress(displayAddress, lat, lng);
                  } else {
                    setLocationFromAddress(displayAddress);
                  }
                }
              );
            } else {
              setLocationFromAddress(displayAddress);
            }
          } catch {
            setLocationFromAddress(displayAddress);
          }

          toast.success(`위치가 "${displayAddress}"로 설정되었습니다.`);
          onClose();
        },
        onclose: () => {
          setIsLoading(false);
        },
      }).open();
    } catch (err) {
      console.error("Postcode error:", err);
      setError("주소 검색 기능을 불러올 수 없습니다.");
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>현재 위치 설정</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 현재 설정된 위치 */}
          {currentLocation && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">현재 설정된 위치</p>
              <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-500" />
                {currentLocation}
              </p>
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* GPS 위치 버튼 */}
          <Button
            onClick={handleGPSLocation}
            disabled={isLoading}
            className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                현재 위치 확인 중...
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4" />
                현재 위치로 설정
              </>
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">또는</span>
            </div>
          </div>

          {/* 주소 검색 버튼 */}
          <Button
            onClick={handleAddressSearch}
            disabled={isLoading}
            variant="outline"
            className="w-full gap-2"
          >
            <Search className="w-4 h-4" />
            주소 검색
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Postcode 스크립트 로더
let postcodeScriptLoaded = false;

function loadPostcodeScript(): Promise<void> {
  if (postcodeScriptLoaded) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.onload = () => {
      postcodeScriptLoaded = true;
      resolve();
    };
    script.onerror = () => {
      reject(new Error("Postcode 스크립트 로드 실패"));
    };
    document.head.appendChild(script);
  });
}
