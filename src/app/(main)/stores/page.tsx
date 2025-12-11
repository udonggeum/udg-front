"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  MapPin,
  X,
  ChevronLeft,
  Heart,
  Store as StoreIcon,
  Phone,
  Clock,
  Star,
} from "lucide-react";
import { getStoresAction } from "@/actions/stores";
import type { StoreDetail } from "@/types/stores";
import StoreMap from "@/components/StoreMap";
import useKakaoLoader from "@/hooks/useKakaoLoader";

const PAGE_SIZE = 50;

type FilterTag = "all" | "open" | "24k" | "diamond" | "repair";

interface StoreWithExtras extends StoreDetail {
  distance?: string;
  tags?: string[];
  iconBg?: string;
  iconColor?: string;
  rating?: number;
  reviewCount?: number;
  isOpen?: boolean;
  lat?: number;
  lng?: number;
}

/**
 * StoresPage Component (Renewed)
 *
 * "매장을 발견하는 플랫폼" - 네이버 지도 + 배민 스타일
 *
 * Layout:
 * 1. Left Panel (420px~480px): Search + Filters + Store List
 * 2. Right Map Area (flex-1): Kakao Map
 * 3. Right Detail Panel (slide): Store detail on selection
 */
export default function StoresPage() {
  // Kakao Maps SDK 로드
  useKakaoLoader();

  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<FilterTag>("all");
  const [selectedStore, setSelectedStore] = useState<StoreWithExtras | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 37.5665,
    lng: 126.978,
  }); // 서울시청 기본 좌표
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [stores, setStores] = useState<StoreWithExtras[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 매장 목록 로드
  useEffect(() => {
    const loadStores = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getStoresAction({
          page: 1,
          page_size: PAGE_SIZE,
        });

        if (result.success && result.data) {
          // 백엔드 데이터에 UI용 추가 정보 추가
          const iconColors = [
            { bg: "bg-yellow-100", color: "text-yellow-600" },
            { bg: "bg-blue-100", color: "text-blue-600" },
            { bg: "bg-purple-100", color: "text-purple-600" },
            { bg: "bg-orange-100", color: "text-orange-600" },
            { bg: "bg-green-100", color: "text-green-600" },
            { bg: "bg-pink-100", color: "text-pink-600" },
          ];

          const transformedStores = result.data.stores.map((store, index) => {
            const colorSet = iconColors[index % iconColors.length];

            // 백엔드에서 받은 위도/경도 사용 (없으면 기본값: 서울시청)
            const lat = (store as any).latitude || 37.5665;
            const lng = (store as any).longitude || 126.978;

            // 이미지 URL 검증 (http:// 또는 https://로 시작하지 않으면 null 처리)
            const isValidImageUrl =
              store.image_url &&
              (store.image_url.startsWith("http://") || store.image_url.startsWith("https://"));

            return {
              ...store,
              image_url: isValidImageUrl ? store.image_url : undefined,
              distance: `${(Math.random() * 2 + 0.3).toFixed(1)}km`, // TODO: 실제 거리 계산
              tags: ["24K", "18K", "수리"].slice(0, Math.floor(Math.random() * 3) + 1),
              iconBg: colorSet.bg,
              iconColor: colorSet.color,
              rating: 4.5 + Math.random() * 0.5,
              reviewCount: Math.floor(Math.random() * 300) + 50,
              isOpen: Math.random() > 0.3,
              lat,
              lng,
            };
          });

          console.log(
            "🗺️ Stores with coordinates:",
            transformedStores.map((s) => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng }))
          );

          setStores(transformedStores);
        } else {
          setError(result.error || "매장 목록을 불러올 수 없습니다.");
        }
      } catch (err) {
        setError("매장 목록을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    loadStores();
  }, []);

  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      // 검색어 필터
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!store.name.toLowerCase().includes(query)) {
          return false;
        }
      }

      // 태그 필터 (실제로는 API에서 필터링)
      if (selectedFilter !== "all") {
        // Mock 로직 - 실제로는 store.tags나 store.services에서 확인
        return true;
      }

      return true;
    });
  }, [stores, searchQuery, selectedFilter]);

  const filterTags: Array<{ id: FilterTag; label: string }> = [
    { id: "all", label: "전체" },
    { id: "open", label: "영업중" },
    { id: "24k", label: "24K 취급" },
    { id: "diamond", label: "다이아몬드" },
    { id: "repair", label: "수리가능" },
  ];

  const handleStoreClick = (store: StoreWithExtras) => {
    setSelectedStore(store);
    setIsDetailPanelOpen(true);
  };

  const closeDetailPanel = () => {
    setIsDetailPanelOpen(false);
    setTimeout(() => setSelectedStore(null), 300); // 애니메이션 후 상태 초기화
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  // 현재 위치 가져오기 (Geolocation API)
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("이 브라우저에서는 위치 정보를 지원하지 않습니다.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const location = { lat: latitude, lng: longitude };
        setUserLocation(location);
        setMapCenter(location);
        // TODO: Backend API 호출 - 반경 2km 내 매장 검색
        // fetchNearbyStores(latitude, longitude, 2000);
      },
      (error) => {
        console.error("위치 정보를 가져올 수 없습니다:", error);
        let errorMessage = "위치 정보를 가져올 수 없습니다.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = "위치 권한을 허용해주세요.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = "위치 정보를 사용할 수 없습니다.";
        } else if (error.code === error.TIMEOUT) {
          errorMessage = "위치 정보를 가져오는 데 시간이 초과되었습니다.";
        }
        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // 지도에서 매장 마커 클릭 시
  const handleMapStoreClick = (store: { id: number; name: string; lat: number; lng: number }) => {
    const fullStore = stores.find((s) => s.id === store.id);
    if (fullStore) {
      handleStoreClick(fullStore);
    }
  };

  return (
    <>
      {/* Main Content */}
      <div className="flex h-screen">
        {/* 좌측 패널 - 검색 및 리스트 */}
        <div className="w-full md:w-[420px] lg:w-[480px] flex-shrink-0 border-r border-gray-100 flex flex-col bg-white">
          {/* 검색 영역 */}
          <div className="p-5 border-b border-gray-100">
            {/* 검색바 */}
            <form onSubmit={handleSearch}>
              <div className="bg-gray-100 rounded-xl p-1 flex items-center transition-all duration-200 mb-4">
                <div className="flex-1 flex items-center gap-3 px-3">
                  <Search className="w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="매장명, 지역으로 검색"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 py-2.5 text-[15px] text-gray-900 placeholder-gray-400 bg-transparent outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-[14px] font-semibold rounded-lg transition-colors duration-200"
                >
                  검색
                </button>
              </div>
            </form>

            {/* 현재 위치 버튼 */}
            <button
              type="button"
              onClick={getCurrentLocation}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 rounded-xl text-[14px] font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200 mb-4"
            >
              <MapPin className="w-5 h-5 text-blue-500" />
              현재 위치로 검색
            </button>

            {/* 필터 태그 */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {filterTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setSelectedFilter(tag.id)}
                  className={`px-4 py-2 text-[13px] font-medium rounded-full border whitespace-nowrap transition-all duration-200 ${
                    selectedFilter === tag.id
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* 결과 헤더 */}
          <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-[14px] text-gray-500">검색결과</span>
              <span className="text-[14px] font-bold text-gray-900">{filteredStores.length}</span>
            </div>
            <div className="relative">
              <select className="appearance-none text-[13px] font-medium text-gray-600 pr-5 cursor-pointer bg-transparent focus:outline-none">
                <option>거리순</option>
                <option>별점순</option>
                <option>리뷰많은순</option>
              </select>
              <svg
                className="w-4 h-4 absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>

          {/* 매장 리스트 */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 px-5 text-center">
                <StoreIcon className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-[16px] font-semibold text-gray-900 mb-2">오류가 발생했습니다</h3>
                <p className="text-[14px] text-gray-500 mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-[14px] font-semibold rounded-lg"
                >
                  다시 시도
                </button>
              </div>
            ) : filteredStores.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-5 text-center">
                <StoreIcon className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-[16px] font-semibold text-gray-900 mb-2">검색 결과가 없습니다</h3>
                <p className="text-[14px] text-gray-500">
                  다른 검색어를 입력하거나 필터를 변경해보세요
                </p>
              </div>
            ) : (
              filteredStores.map((store) => (
                <div
                  key={store.id}
                  onClick={() => handleStoreClick(store)}
                  className={`p-5 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors duration-200 border-l-4 ${
                    selectedStore?.id === store.id
                      ? "bg-gray-50 border-l-gray-900"
                      : "border-l-transparent"
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                      {store.image_url ? (
                        <img
                          src={store.image_url}
                          alt={store.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            const parent = target.parentElement;
                            if (parent) {
                              parent.classList.add(store.iconBg || "bg-gray-100");
                              parent.innerHTML = `
                                <div class="w-full h-full flex items-center justify-center">
                                  <svg class="w-10 h-10 ${store.iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z"></path>
                                  </svg>
                                </div>
                              `;
                            }
                          }}
                        />
                      ) : (
                        <div
                          className={`w-full h-full ${store.iconBg} flex items-center justify-center`}
                        >
                          <StoreIcon
                            className={`w-10 h-10 ${store.iconColor}`}
                            strokeWidth={1.5}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[16px] font-semibold text-gray-900 truncate">
                          {store.name}
                        </h3>
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[11px] font-medium rounded flex-shrink-0">
                          {store.isOpen ? "영업중" : "준비중"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[13px] mb-2">
                        <span className="text-yellow-500 font-semibold">
                          ★ {store.rating?.toFixed(1) || "4.5"}
                        </span>
                        <span className="text-gray-300">|</span>
                        <span className="text-gray-500">리뷰 {store.reviewCount || 0}</span>
                      </div>
                      <p className="text-[13px] text-gray-500 mb-2 truncate">
                        {store.address || "주소 정보 없음"}
                      </p>
                      {store.tags && store.tags.length > 0 && (
                        <div className="flex items-center gap-2">
                          {store.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-gray-100 text-gray-600 text-[11px] font-medium rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-start">
                      <span className="text-[13px] font-semibold text-blue-600">
                        {store.distance}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 지도 영역 (중앙) - Kakao Map */}
        <div className="hidden md:flex flex-1 relative">
          <StoreMap
            stores={filteredStores.map((store) => ({
              id: store.id,
              name: store.name,
              lat: store.lat || 37.5665,
              lng: store.lng || 126.978,
              isOpen: store.isOpen,
            }))}
            selectedStoreId={selectedStore?.id}
            onStoreClick={handleMapStoreClick}
            center={userLocation || mapCenter}
            onCenterChange={setMapCenter}
          />
        </div>

        {/* 우측 상세 패널 (PC) - 슬라이드 애니메이션 */}
        <div
          className={`hidden md:flex flex-col bg-white border-l border-gray-100 overflow-hidden transition-all duration-300 ease-in-out ${
            isDetailPanelOpen ? "w-[420px] lg:w-[480px]" : "w-0"
          }`}
        >
          {selectedStore && (
            <div
              className={`transition-opacity duration-200 ${isDetailPanelOpen ? "opacity-100" : "opacity-0"}`}
            >
              {/* 헤더 */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 z-10">
                <button
                  type="button"
                  onClick={closeDetailPanel}
                  className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-[15px] font-medium text-gray-900">매장 정보</span>
              </div>

              {/* 사진 갤러리 */}
              <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                <div className="w-full h-48 overflow-hidden bg-gray-100 flex-shrink-0">
                  {selectedStore.image_url ? (
                    <img
                      src={selectedStore.image_url}
                      alt={selectedStore.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent) {
                          parent.classList.add(selectedStore.iconBg || "bg-gray-100");
                          parent.innerHTML = `
                            <div class="w-full h-full flex items-center justify-center">
                              <svg class="w-16 h-16 ${selectedStore.iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z"></path>
                              </svg>
                            </div>
                          `;
                        }
                      }}
                    />
                  ) : (
                    <div
                      className={`w-full h-full ${selectedStore.iconBg} flex items-center justify-center`}
                    >
                      <StoreIcon className={`w-16 h-16 ${selectedStore.iconColor}`} strokeWidth={1.5} />
                    </div>
                  )}
                </div>
              </div>

              {/* 스크롤 콘텐츠 */}
              <div className="p-5 overflow-y-auto">
                {/* 매장명 & 기본 정보 */}
                <div className="pb-4 border-b border-gray-100">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <button
                        type="button"
                        onClick={() => router.push(`/stores/${selectedStore.id}`)}
                        className="hover:underline"
                      >
                        <h3 className="text-[20px] font-bold text-gray-900 mb-1">
                          {selectedStore.name}
                        </h3>
                      </button>
                      <div className="flex items-center gap-2 text-[14px]">
                        <span className="text-yellow-500 font-semibold flex items-center gap-1">
                          <Star className="w-4 h-4 fill-current" />
                          {selectedStore.rating?.toFixed(1) || "4.5"}
                        </span>
                        <span className="text-gray-300">·</span>
                        <span className="text-gray-500">리뷰 {selectedStore.reviewCount || 0}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="w-10 h-10 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                      <Heart className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                  {/* 영업 상태 */}
                  <div className="flex items-center gap-2 text-[14px]">
                    <span className={selectedStore.isOpen ? "text-green-600 font-medium" : "text-gray-500"}>
                      {selectedStore.isOpen ? "영업중" : "준비중"}
                    </span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-500">20:00 마감</span>
                  </div>
                </div>

                {/* 전문분야 */}
                <div className="py-4 border-b border-gray-100">
                  <h4 className="text-[13px] font-medium text-gray-500 mb-2">전문분야</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedStore.tags && selectedStore.tags.length > 0 ? (
                      selectedStore.tags.map((tag, idx) => (
                        <span
                          key={tag}
                          className={`px-3 py-1.5 text-[13px] font-medium rounded-full ${
                            idx === 0
                              ? "bg-gray-900 text-white"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <>
                        <span className="px-3 py-1.5 bg-gray-900 text-white text-[13px] font-medium rounded-full">
                          수리/리폼
                        </span>
                        <span className="px-3 py-1.5 bg-gray-100 text-gray-700 text-[13px] font-medium rounded-full">
                          시세 매입
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* 위치 & 연락처 */}
                <div className="py-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-[14px] text-gray-900">
                          {selectedStore.address || "주소 정보 없음"}
                        </p>
                        <p className="text-[13px] text-blue-600 font-medium">
                          {selectedStore.distance}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <p className="text-[14px] text-gray-900">
                        {selectedStore.phone || "02-1234-5678"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <p className="text-[14px] text-gray-900">10:00 - 20:00</p>
                    </div>
                  </div>
                </div>

                {/* 매장 상세보기 버튼 */}
                <button
                  type="button"
                  onClick={() => router.push(`/stores/${selectedStore.id}`)}
                  className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white text-[15px] font-semibold rounded-xl transition-colors duration-200"
                >
                  매장 상세보기
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 모바일 바텀시트 (추후 구현) */}
      </div>
    </>
  );
}
