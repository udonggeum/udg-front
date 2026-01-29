"use client";

import { useEffect, useState, useMemo, Fragment, memo } from "react";
import { useRouter } from "next/navigation";
import { Map, MapMarker, CustomOverlayMap, Circle } from "react-kakao-maps-sdk";
import { DollarSign, Navigation } from "lucide-react";
import type { Tag } from "@/types/stores";
import { toast } from "sonner";

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
  onStoreClose?: () => void;
  center?: { lat: number; lng: number };
  level?: number;
  onCenterChange?: (center: { lat: number; lng: number }) => void;
  onSearchThisArea?: (center: { lat: number; lng: number }, level: number) => void;
  userLocation?: { lat: number; lng: number } | null;
  isDetailPanelOpen?: boolean;
  searchCenter?: { lat: number; lng: number } | null;
  searchRadius?: number; // km 단위
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
  onStoreClose,
  center: propCenter,
  level: propLevel,
  onCenterChange,
  onSearchThisArea,
  userLocation,
  isDetailPanelOpen,
  searchCenter,
  searchRadius,
}: StoreMapProps) {
  const router = useRouter();
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [center, setCenter] = useState(
    propCenter || { lat: 37.5665, lng: 126.978 } // 서울시청 기본 좌표
  );
  const [level, setLevel] = useState(propLevel || 5); // 지도 줌 레벨 (1~14)
  const [bounds, setBounds] = useState<kakao.maps.LatLngBounds | null>(null);
  const [prevSelectedStoreId, setPrevSelectedStoreId] = useState<number | null | undefined>(null);
  const [initialCenter, setInitialCenter] = useState(propCenter || { lat: 37.5665, lng: 126.978 });
  const [showSearchButton, setShowSearchButton] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // prop center/level이 변경되면 지도 중심 및 줌 레벨 업데이트 (선택된 매장이 변경될 때만)
  // 사용자가 지도를 움직인 후에는 강제로 중심을 변경하지 않음
  useEffect(() => {
    if (propCenter && selectedStoreId !== prevSelectedStoreId) {
      setCenter(propCenter);
      setPrevSelectedStoreId(selectedStoreId);
    }
  }, [propCenter, selectedStoreId, prevSelectedStoreId]);

  // prop level이 변경되면 지도 줌 레벨 업데이트
  useEffect(() => {
    if (propLevel !== undefined) {
      setLevel(propLevel);
    }
  }, [propLevel]);

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

  // 선택된 매장이 변경되면 해당 위치로 지도 중심 이동
  useEffect(() => {
    if (selectedStoreId && map && selectedStoreId !== prevSelectedStoreId) {
      const selectedStore = stores.find((store) => store.id === selectedStoreId);
      if (selectedStore) {
        const moveLatLon = new kakao.maps.LatLng(selectedStore.lat, selectedStore.lng);
        map.panTo(moveLatLon);
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
      // 지도가 이동하면 선택된 매장 해제
      if (selectedStoreId && onStoreClose) {
        onStoreClose();
      }
    }

    if (onCenterChange) {
      onCenterChange(newCenter);
    }
  };

  // 십자선(left: 50%, top: 50%)이 가리키는 정확한 좌표 계산
  const getVisibleCenter = () => {                                                                                                         
    if (!map) return center;                                                                                                               
    const mapCenter = map.getCenter();                                                                                                     
    return { lat: mapCenter.getLat(), lng: mapCenter.getLng() };  
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
      const visibleCenter = getVisibleCenter(); // 실제 보이는 중심 사용
      onSearchThisArea(visibleCenter, level);
      setInitialCenter(visibleCenter);
      setShowSearchButton(false);
    }
  };

  // 내 위치로 이동
  const handleMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("이 브라우저에서는 위치 정보를 지원하지 않습니다");
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const location = { lat: latitude, lng: longitude };

        // 지도 중심을 내 위치로 이동
        setCenter(location);
        setLevel(5); // 적절한 줌 레벨로 설정

        if (map) {
          const moveLatLon = new kakao.maps.LatLng(latitude, longitude);
          map.panTo(moveLatLon);
        }

        setIsGettingLocation(false);
        toast.success("현재 위치로 이동했습니다");
      },
      (error) => {
        setIsGettingLocation(false);

        let errorMessage = "위치 정보를 가져올 수 없습니다";
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = "위치 권한을 허용해주세요";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = "위치 정보를 사용할 수 없습니다";
        } else if (error.code === error.TIMEOUT) {
          errorMessage = "위치 정보를 가져오는 데 시간이 초과되었습니다";
        }

        toast.error(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
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

      {/* 내 위치 버튼 - 우하단 플로팅 */}
      <div className="absolute bottom-6 right-6 z-10">
        <button
          onClick={handleMyLocation}
          disabled={isGettingLocation}
          className="w-12 h-12 bg-white hover:bg-gray-50 text-gray-700 rounded-full shadow-lg border border-gray-200 flex items-center justify-center transition-all duration-200 hover:shadow-xl active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          title="내 위치로 이동"
        >
          {isGettingLocation ? (
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Navigation className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* 지도 중심점 표시 (십자선) - 항상 남은 지도 영역의 시각적 중앙 */}
      <div
        className="absolute top-1/2 -translate-y-1/2 z-[5] pointer-events-none"
        style={{
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}
      >
        {/* 중심 원 */}
        <div className="relative flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-[#C9A227] border-2 border-white shadow-lg"></div>
          {/* 펄스 효과 */}
          <div className="absolute inset-0 w-4 h-4 rounded-full bg-[#C9A227] opacity-20 animate-ping"></div>
        </div>
        {/* 십자선 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          {/* 가로선 */}
          <div className="absolute top-1/2 left-1/2 -translate-y-1/2 w-8 h-0.5 bg-[#C9A227]" style={{ marginLeft: '-16px' }}></div>
          {/* 세로선 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-[#C9A227]" style={{ marginTop: '-16px' }}></div>
        </div>
      </div>

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
                    {/* 헤더: 매장명 + X 버튼 */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-caption font-bold text-gray-900 flex-1">
                        {store.name}
                      </h4>
                      {onStoreClose && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onStoreClose();
                          }}
                          className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="닫기"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>

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

      {/* 검색 반경 시각화 */}
      {searchCenter && searchRadius && (
        <>
          {/* 반경 원 */}
          <Circle
            center={searchCenter}
            radius={searchRadius * 1000} // km -> m 변환
            strokeWeight={2}
            strokeColor="#C9A227"
            strokeOpacity={0.8}
            strokeStyle="solid"
            fillColor="#C9A227"
            fillOpacity={0.1}
          />

          {/* 검색 중심점 마커 */}
          <CustomOverlayMap
            position={searchCenter}
            xAnchor={0.5}
            yAnchor={0.5}
          >
            <div className="relative flex items-center justify-center">
              {/* 중심점 */}
              <div className="w-3 h-3 rounded-full bg-[#C9A227] border-2 border-white shadow-lg z-10" />
              {/* 펄스 효과 */}
              <div className="absolute w-3 h-3 rounded-full bg-[#C9A227] opacity-30 animate-ping" />
            </div>
          </CustomOverlayMap>

          {/* 반경 정보 라벨 */}
          <CustomOverlayMap
            position={searchCenter}
            xAnchor={0.5}
            yAnchor={-0.5}
          >
            <div className="bg-white px-3 py-1.5 rounded-full shadow-lg border border-gray-200 pointer-events-none">
              <span className="text-xs font-semibold text-[#C9A227]">
                반경 {searchRadius}km
              </span>
            </div>
          </CustomOverlayMap>
        </>
      )}

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
