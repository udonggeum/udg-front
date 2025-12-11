"use client";

import { useEffect, useState } from "react";
import { Map, MapMarker, CustomOverlayMap } from "react-kakao-maps-sdk";

// Kakao Maps SDK 로드 확인
declare global {
  interface Window {
    kakao: any;
  }
}

interface StoreLocation {
  id: number;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  isOpen?: boolean;
}

interface StoreMapProps {
  stores: StoreLocation[];
  selectedStoreId?: number | null;
  onStoreClick?: (store: StoreLocation) => void;
  center?: { lat: number; lng: number };
  onCenterChange?: (center: { lat: number; lng: number }) => void;
}

/**
 * StoreMap Component
 *
 * Kakao Maps SDK를 사용한 매장 지도 컴포넌트
 *
 * Features:
 * - 매장 마커 표시
 * - 마커 클릭 이벤트
 * - 선택된 마커 강조
 * - 지도 중심 이동
 * - 커스텀 오버레이 (매장명 표시)
 */
export default function StoreMap({
  stores,
  selectedStoreId,
  onStoreClick,
  center: propCenter,
  onCenterChange,
}: StoreMapProps) {
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [center, setCenter] = useState(
    propCenter || { lat: 37.5665, lng: 126.978 } // 서울시청 기본 좌표
  );
  const [level, setLevel] = useState(5); // 지도 줌 레벨 (1~14)

  // prop center가 변경되면 지도 중심 업데이트
  useEffect(() => {
    if (propCenter) {
      setCenter(propCenter);
    }
  }, [propCenter]);

  // 선택된 매장이 변경되면 해당 위치로 지도 중심 이동
  useEffect(() => {
    if (selectedStoreId && map) {
      const selectedStore = stores.find((store) => store.id === selectedStoreId);
      if (selectedStore) {
        const moveLatLon = new kakao.maps.LatLng(selectedStore.lat, selectedStore.lng);
        map.panTo(moveLatLon); // 부드럽게 이동
      }
    }
  }, [selectedStoreId, stores, map]);

  const handleMarkerClick = (store: StoreLocation) => {
    if (onStoreClick) {
      onStoreClick(store);
    }
  };

  const handleCenterChanged = (map: kakao.maps.Map) => {
    const latlng = map.getCenter();
    const newCenter = { lat: latlng.getLat(), lng: latlng.getLng() };
    setCenter(newCenter);
    if (onCenterChange) {
      onCenterChange(newCenter);
    }
  };

  return (
    <Map
      center={center}
      style={{ width: "100%", height: "100%" }}
      level={level}
      onCreate={setMap}
      onCenterChanged={handleCenterChanged}
      onZoomChanged={(map) => setLevel(map.getLevel())}
    >
      {stores.map((store) => {
        const isSelected = selectedStoreId === store.id;

        return (
          <div key={store.id}>
            {/* 기본 마커 */}
            <MapMarker
              position={{ lat: store.lat, lng: store.lng }}
              onClick={() => handleMarkerClick(store)}
              image={{
                src: isSelected
                  ? "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png"
                  : "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png",
                size: {
                  width: isSelected ? 40 : 32,
                  height: isSelected ? 44 : 35,
                },
              }}
            />

            {/* 커스텀 오버레이 - 선택 시에만 매장명 표시 */}
            {isSelected && (
              <CustomOverlayMap position={{ lat: store.lat, lng: store.lng }} yAnchor={1.8}>
                <div
                  className="px-3 py-1.5 bg-white rounded-lg shadow-lg border border-gray-200"
                  style={{
                    transform: "translate(-50%, 0)",
                    pointerEvents: "none",
                  }}
                >
                  <p className="text-[12px] font-semibold text-gray-900 whitespace-nowrap">
                    {store.name}
                  </p>
                </div>
              </CustomOverlayMap>
            )}
          </div>
        );
      })}

      {/* 현재 위치 마커 (propCenter가 서울시청이 아닐 때) */}
      {propCenter && (propCenter.lat !== 37.5665 || propCenter.lng !== 126.978) && (
        <MapMarker
          position={propCenter}
          image={{
            src: "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_blue.png",
            size: { width: 36, height: 37 },
          }}
        />
      )}
    </Map>
  );
}
