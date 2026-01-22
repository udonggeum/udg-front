"use client";

import { useEffect, useState, useMemo, Fragment, memo } from "react";
import { useRouter } from "next/navigation";
import { Map, MapMarker, CustomOverlayMap } from "react-kakao-maps-sdk";
import { DollarSign } from "lucide-react";
import type { Tag } from "@/types/stores";

// Kakao Maps SDK 로드 확인
declare global {
  interface Window {
    kakao: any;
  }
}

interface StoreLocation {
  id: number;
  name: string;
  slug?: string;
  lat: number;
  lng: number;
  address?: string;
  isOpen?: boolean;
  tags?: Tag[];
  distance?: string;
  is_verified?: boolean;
  is_managed?: boolean;
}

interface StoreMapProps {
  stores: StoreLocation[];
  selectedStoreId?: number | null;
  onStoreClick?: (store: StoreLocation) => void;
  center?: { lat: number; lng: number };
  onCenterChange?: (center: { lat: number; lng: number }) => void;
  onSearchThisArea?: (center: { lat: number; lng: number }) => void;
  userLocation?: { lat: number; lng: number } | null;
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
function StoreMap({
  stores,
  selectedStoreId,
  onStoreClick,
  center: propCenter,
  onCenterChange,
  onSearchThisArea,
  userLocation,
}: StoreMapProps) {
  const router = useRouter();
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [center, setCenter] = useState(
    propCenter || { lat: 37.5665, lng: 126.978 } // 서울시청 기본 좌표
  );
  const [level, setLevel] = useState(5); // 지도 줌 레벨 (1~14)
  const [bounds, setBounds] = useState<kakao.maps.LatLngBounds | null>(null);
  const [prevSelectedStoreId, setPrevSelectedStoreId] = useState<number | null | undefined>(null);
  const [initialCenter, setInitialCenter] = useState(propCenter || { lat: 37.5665, lng: 126.978 });
  const [showSearchButton, setShowSearchButton] = useState(false);

  // prop center가 변경되면 지도 중심 업데이트 (선택된 매장이 변경될 때만)
  // 사용자가 지도를 움직인 후에는 강제로 중심을 변경하지 않음
  useEffect(() => {
    if (propCenter && selectedStoreId !== prevSelectedStoreId) {
      setCenter(propCenter);
      setPrevSelectedStoreId(selectedStoreId);
    }
  }, [propCenter, selectedStoreId, prevSelectedStoreId]);

  // 매장 데이터가 로드되면 전체 매장 bounds fit (초기 포커싱)
  useEffect(() => {
    if (map && stores.length > 0 && !propCenter) {
      const bounds = new kakao.maps.LatLngBounds();

      stores.forEach((store) => {
        bounds.extend(new kakao.maps.LatLng(store.lat, store.lng));
      });

      // bounds fit with padding
      map.setBounds(bounds, 50, 50, 50, 50);
    }
  }, [map, stores, propCenter]);

  // 선택된 매장이 변경되면 해당 위치로 지도 중심 이동 (한 번만)
  useEffect(() => {
    if (selectedStoreId && map && selectedStoreId !== prevSelectedStoreId) {
      const selectedStore = stores.find((store) => store.id === selectedStoreId);
      if (selectedStore) {
        const moveLatLon = new kakao.maps.LatLng(selectedStore.lat, selectedStore.lng);
        map.panTo(moveLatLon); // 부드럽게 이동
      }
    }
  }, [selectedStoreId, stores, map, prevSelectedStoreId]);

  const handleMarkerClick = (store: StoreLocation) => {
    if (onStoreClick) {
      onStoreClick(store);
    }
  };

  const handleCenterChanged = (map: kakao.maps.Map) => {
    const latlng = map.getCenter();
    const newCenter = { lat: latlng.getLat(), lng: latlng.getLng() };
    setCenter(newCenter);
    setBounds(map.getBounds());

    // 지도가 이동했는지 확인 (100m 이상 이동 시 버튼 표시)
    const distance = getDistance(initialCenter.lat, initialCenter.lng, newCenter.lat, newCenter.lng);
    if (distance > 0.1) { // 100m 이상 이동
      setShowSearchButton(true);
    }

    if (onCenterChange) {
      onCenterChange(newCenter);
    }
  };

  // 거리 계산 함수 (km 단위)
  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // 지구 반지름 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // 현재 지역 재검색
  const handleSearchThisArea = () => {
    if (onSearchThisArea) {
      onSearchThisArea(center);
      setInitialCenter(center);
      setShowSearchButton(false);
    }
  };

  // Viewport 내 매장만 필터링 (성능 최적화)
  const visibleStores = useMemo(() => {
    if (!bounds || stores.length < 100) {
      // 매장이 100개 미만이면 전체 표시
      return stores;
    }

    // Viewport 내 매장만 필터링
    return stores.filter((store) => {
      const position = new kakao.maps.LatLng(store.lat, store.lng);
      return bounds.contain(position);
    });
  }, [bounds, stores]);

  return (
    <div className="relative w-full h-full">
      {/* 현재 지역 재검색 버튼 */}
      {showSearchButton && onSearchThisArea && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={handleSearchThisArea}
            className="bg-white hover:bg-gray-50 text-gray-900 font-semibold rounded-full shadow-lg border border-gray-200 px-6 py-3 flex items-center gap-2 transition-all duration-200 hover:shadow-xl active:scale-95"
          >
            <svg
              className="w-5 h-5 text-[#C9A227]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span className="text-sm">현재 지역 재검색</span>
          </button>
        </div>
      )}

      <Map
        center={center}
        style={{ width: "100%", height: "100%" }}
        level={level}
        onCreate={setMap}
        onCenterChanged={handleCenterChanged}
        onZoomChanged={(map) => setLevel(map.getLevel())}
      >
      {visibleStores.map((store) => {
        const isSelected = selectedStoreId === store.id;
        const isOpen = store.isOpen !== false; // 기본값 true

        // 매장 상태에 따른 색상 결정
        const getMarkerColor = () => {
          if (store.is_verified) {
            // 인증 매장: 골드색
            return {
              bg: isSelected
                ? "bg-gradient-to-br from-[#C9A227] to-[#8A6A00]"
                : "bg-gradient-to-br from-[#C9A227] to-[#C9A227]",
              border: "border-t-[#8A6A00]",
              pulse: "bg-[#C9A227]",
            };
          } else if (store.is_managed) {
            // 관리 매장: 블루색
            return {
              bg: isSelected
                ? "bg-gradient-to-br from-blue-500 to-blue-700"
                : "bg-gradient-to-br from-blue-500 to-blue-500",
              border: "border-t-blue-700",
              pulse: "bg-blue-500",
            };
          } else {
            // 미관리 매장: 회색
            return {
              bg: "bg-gray-400",
              border: "border-t-gray-400",
              pulse: "bg-gray-400",
            };
          }
        };

        const markerColor = getMarkerColor();

        return (
          <Fragment key={store.id}>
            {/* 커스텀 마커 (금은방 브랜드) */}
            <CustomOverlayMap
              key={`marker-${store.id}`}
              position={{ lat: store.lat, lng: store.lng }}
              xAnchor={0.5}
              yAnchor={1}
            >
              <div
                onClick={() => handleMarkerClick(store)}
                className="relative cursor-pointer"
              >
                {/* 마커 핀 */}
                <div
                  className={`
                    flex items-center justify-center rounded-full border-2 border-white shadow-lg
                    transition-all duration-200
                    ${isSelected ? "w-12 h-12 shadow-xl scale-110" : "w-10 h-10 hover:scale-110"}
                    ${markerColor.bg}
                  `}
                >
                  <DollarSign
                    className={`text-white ${isSelected ? "w-6 h-6" : "w-5 h-5"}`}
                    strokeWidth={2.5}
                  />
                </div>

                {/* 아래 삼각형 (핀 모양) */}
                <div
                  className={`
                    absolute left-1/2 -translate-x-1/2
                    ${markerColor.border}
                  `}
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: "6px solid transparent",
                    borderRight: "6px solid transparent",
                    borderTop: "8px solid",
                    bottom: "-8px",
                  }}
                />

                {/* 선택 시 펄스 효과 */}
                {isSelected && (
                  <div className={`absolute inset-0 rounded-full ${markerColor.pulse} opacity-30 animate-ping`} />
                )}
              </div>
            </CustomOverlayMap>

            {/* 인포윈도우 - 선택 시 매장 정보 표시 */}
            {isSelected && (
              <CustomOverlayMap
                key={`info-${store.id}`}
                position={{ lat: store.lat, lng: store.lng }}
                xAnchor={0.5}
                yAnchor={2.2}
              >
                <div
                  className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
                  style={{
                    pointerEvents: "auto",
                    minWidth: "200px",
                    maxWidth: "280px",
                  }}
                >
                  <div className="p-3">
                    {/* 매장명 */}
                    <h4 className="text-caption font-bold text-gray-900 mb-1">
                      {store.name}
                    </h4>

                    {/* 거리 정보 */}
                    {store.distance && (
                      <p className="text-[12px] text-blue-600 font-semibold mb-2">
                        📍 {store.distance}
                      </p>
                    )}

                    {/* 매장 태그 */}
                    {store.tags && store.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {store.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={tag.id}
                            className={`
                              px-2 py-0.5 text-[11px] font-medium rounded-full
                              ${idx === 0
                                ? "bg-[#FEF9E7] text-[#8A6A00]"
                                : "bg-gray-100 text-gray-600"
                              }
                            `}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 영업 상태 - 관리매장만 표시 */}
                    {store.is_managed && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span
                          className={`
                            w-2 h-2 rounded-full
                            ${isOpen ? "bg-green-500" : "bg-gray-400"}
                          `}
                        />
                        <span className={isOpen ? "text-green-600 font-medium" : "text-gray-500"}>
                          {isOpen ? "영업중" : "준비중"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 상세보기 버튼 */}
                  <button
                    onClick={() => {
                      const url = store.slug
                        ? `/stores/${store.id}/${store.slug}`
                        : `/stores/${store.id}`;
                      router.push(url);
                    }}
                    className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-[12px] font-medium transition-colors"
                  >
                    상세보기 →
                  </button>
                </div>
              </CustomOverlayMap>
            )}
          </Fragment>
        );
      })}

      {/* 현재 위치 마커 */}
      {userLocation && (
        <CustomOverlayMap key="current-location" position={userLocation} xAnchor={0.5} yAnchor={1}>
          <div
            className="relative"
          >
            {/* 현재 위치 마커 */}
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 border-4 border-white shadow-lg">
              <div className="w-3 h-3 rounded-full bg-white" />
            </div>
            {/* 아래 삼각형 (핀 모양) */}
            <div
              className="absolute left-1/2 -translate-x-1/2 border-t-blue-500"
              style={{
                width: 0,
                height: 0,
                borderLeft: "6px solid transparent",
                borderRight: "6px solid transparent",
                borderTop: "8px solid",
                bottom: "-8px",
              }}
            />
            {/* 펄스 효과 */}
            <div className="absolute inset-0 rounded-full bg-blue-400 opacity-30 animate-ping" />
          </div>
        </CustomOverlayMap>
      )}
      </Map>
    </div>
  );
}

export default memo(StoreMap);
