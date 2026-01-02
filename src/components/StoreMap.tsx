"use client";

import { useEffect, useState, useMemo, Fragment } from "react";
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
  lat: number;
  lng: number;
  address?: string;
  isOpen?: boolean;
  tags?: Tag[];
  distance?: string;
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
  const [bounds, setBounds] = useState<kakao.maps.LatLngBounds | null>(null);
  const [prevSelectedStoreId, setPrevSelectedStoreId] = useState<number | null | undefined>(null);

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
    if (onCenterChange) {
      onCenterChange(newCenter);
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

        return (
          <Fragment key={store.id}>
            {/* 커스텀 마커 (금은방 브랜드) */}
            <CustomOverlayMap
              key={`marker-${store.id}`}
              position={{ lat: store.lat, lng: store.lng }}
              yAnchor={1}
            >
              <div
                onClick={() => handleMarkerClick(store)}
                className="relative cursor-pointer"
                style={{
                  transform: "translate(-50%, -100%)",
                }}
              >
                {/* 마커 핀 */}
                <div
                  className={`
                    flex items-center justify-center rounded-full border-2 border-white shadow-lg
                    transition-all duration-200
                    ${isSelected ? "w-12 h-12 shadow-xl" : "w-10 h-10"}
                    ${isOpen
                      ? isSelected
                        ? "bg-gradient-to-br from-[#C9A227] to-[#8A6A00] scale-110"
                        : "bg-gradient-to-br from-[#C9A227] to-[#C9A227] hover:scale-110"
                      : "bg-gray-400"
                    }
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
                    ${isOpen ? "border-t-[#8A6A00]" : "border-t-gray-400"}
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
                  <div className="absolute inset-0 rounded-full bg-[#C9A227] opacity-30 animate-ping" />
                )}
              </div>
            </CustomOverlayMap>

            {/* 인포윈도우 - 선택 시 매장 정보 표시 */}
            {isSelected && (
              <CustomOverlayMap
                key={`info-${store.id}`}
                position={{ lat: store.lat, lng: store.lng }}
                yAnchor={2.2}
              >
                <div
                  className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
                  style={{
                    transform: "translate(-50%, 0)",
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

                    {/* 영업 상태 */}
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
                  </div>

                  {/* 상세보기 버튼 */}
                  <button
                    onClick={() => handleMarkerClick(store)}
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

      {/* 현재 위치 마커 (propCenter가 서울시청이 아닐 때) */}
      {propCenter && (propCenter.lat !== 37.5665 || propCenter.lng !== 126.978) && (
        <CustomOverlayMap key="current-location" position={propCenter} yAnchor={1}>
          <div
            className="relative"
            style={{
              transform: "translate(-50%, -100%)",
            }}
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
  );
}
