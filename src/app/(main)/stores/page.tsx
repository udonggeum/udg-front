"use client";

import { useState, useEffect, useMemo, useCallback, Suspense, memo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  MapPin,
  X,
  Heart,
  Store as StoreIcon,
  Phone,
  Clock,
} from "lucide-react";
import { getStoresAction, toggleStoreLikeAction } from "@/actions/stores";
import type { StoreDetail, Tag } from "@/types/stores";
import StoreMap from "@/components/StoreMap";
import useKakaoLoader from "@/hooks/useKakaoLoader";
import { getDistanceText } from "@/utils/distance";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";
import { useAuthenticatedAction } from "@/hooks/useAuthenticatedAction";
import { Button } from "@/components/ui/button";
import { Virtuoso } from "react-virtuoso";

/**
 * 매장 이미지 컴포넌트 - 로딩 실패 시 폴백 UI 표시
 * React.memo로 최적화: props가 변경되지 않으면 재렌더링 방지
 */
const StoreImage = memo(function StoreImage({
  imageUrl,
  storeName,
  iconBg,
  iconColor,
  size = "md",
}: {
  imageUrl?: string;
  storeName: string;
  iconBg?: string;
  iconColor?: string;
  size?: "sm" | "md" | "lg";
}) {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: "w-20 h-20",
    md: "w-full h-48",
    lg: "w-full h-full",
  };

  const iconSizes = {
    sm: "w-10 h-10",
    md: "w-16 h-16",
    lg: "w-20 h-20",
  };

  // URL 유효성 검사 - http://, https://, data: 로 시작하는지 확인 (base64 이미지 포함)
  const isValidUrl = imageUrl && (
    imageUrl.startsWith("http://") ||
    imageUrl.startsWith("https://") ||
    imageUrl.startsWith("data:")
  );

  // 이미지가 없거나, 유효하지 않은 URL이거나, 로딩 실패 시 폴백 UI
  if (!imageUrl || !isValidUrl || imageError) {
    return (
      <div
        className={`${sizeClasses[size]} ${iconBg || "bg-gray-100"} flex items-center justify-center`}
      >
        <StoreIcon className={`${iconSizes[size]} ${iconColor || "text-gray-400"}`} strokeWidth={1.5} />
      </div>
    );
  }

  // 정상 이미지 표시 (흰색 배경)
  return (
    <div className={`${sizeClasses[size]} bg-white flex items-center justify-center overflow-hidden`}>
      <img
        src={imageUrl}
        alt={storeName}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
      />
    </div>
  );
});

const PAGE_SIZE = 50;

// 페이지를 dynamic으로 설정 (useSearchParams 사용을 위해)
export const dynamic = 'force-dynamic';

type FilterTag = "all" | "open" | "gold" | "liked";

/**
 * 프론트엔드 필터 → 백엔드 태그 매핑
 * UI는 4개 필터로 간결하게 유지하되, 백엔드의 세부 태그들을 그룹화하여 검색
 */
const filterTagMap: Record<string, string[]> = {
  "gold": ["금 매입", "24K 취급", "18K 취급", "14K 취급", "24k", "18k", "14k"],
};

/**
 * 현재 시간이 영업 시간 내인지 확인
 */
function checkIfOpen(openTime?: string, closeTime?: string): boolean {
  if (!openTime || !closeTime) {
    return true; // 영업 시간 정보가 없으면 기본적으로 영업중으로 표시
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  // "09:00" 형식을 분으로 변환
  const parseTime = (time: string): number => {
    const [hour, minute] = time.split(":").map(Number);
    return hour * 60 + minute;
  };

  const openMinutes = parseTime(openTime);
  const closeMinutes = parseTime(closeTime);

  return currentTime >= openMinutes && currentTime < closeMinutes;
}

interface StoreWithExtras extends StoreDetail {
  distance?: string;
  iconBg?: string;
  iconColor?: string;
  isOpen?: boolean;
  lat?: number;
  lng?: number;
  isLiked?: boolean;
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
// useSearchParams를 사용하는 내부 컴포넌트
function StoresPageContent() {
  // Kakao Maps SDK 로드
  useKakaoLoader();

  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, tokens } = useAuthStore();
  const accessToken = tokens?.access_token;
  const { checkAndHandleUnauthorized } = useAuthenticatedAction();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedFilter, setSelectedFilter] = useState<FilterTag>("all");
  const [selectedStore, setSelectedStore] = useState<StoreWithExtras | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [isMobileMapOpen, setIsMobileMapOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"distance">("distance");
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 37.5665,
    lng: 126.978,
  }); // 서울시청 기본 좌표
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [stores, setStores] = useState<StoreWithExtras[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 매장 클릭 핸들러 (useCallback으로 메모이제이션)
  const handleStoreClick = useCallback((store: StoreWithExtras) => {
    // 모바일에서는 상세 페이지로 바로 이동
    if (window.innerWidth < 768) {
      router.push(`/stores/${store.id}/${store.slug}`);
    } else {
      // PC에서는 우측 패널 열기 + 지도 중심 이동
      setSelectedStore(store);
      setIsDetailPanelOpen(true);

      // 선택된 매장 위치로 지도 중심 이동
      if (store.lat && store.lng) {
        setMapCenter({ lat: store.lat, lng: store.lng });
      }
    }
  }, [router]);

  // 초기 로드 시 사용자 위치 자동 획득 (비침입적)
  useEffect(() => {
    if (navigator.geolocation) {
      console.log("🔄 Requesting user location...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const location = { lat: latitude, lng: longitude };
          console.log("✅ User location obtained:", location);
          setUserLocation(location);
          setMapCenter(location);
        },
        (error) => {
          console.log("❌ Failed to get user location:", error.message);
          console.log("ℹ️ Trying user profile location as fallback");

          // GPS 실패 시 사용자 프로필의 위경도 사용
          if (user?.latitude !== undefined && user?.longitude !== undefined) {
            const location = { lat: user.latitude, lng: user.longitude };
            console.log("✅ Using user profile location:", location);
            setUserLocation(location);
            setMapCenter(location);
          } else {
            console.log("ℹ️ No user profile location available");
          }
        },
        {
          enableHighAccuracy: false, // 빠른 응답 우선
          timeout: 10000, // 10초로 늘림
          maximumAge: 300000, // 5분간 캐시 허용
        }
      );
    } else if (user?.latitude !== undefined && user?.longitude !== undefined) {
      // Geolocation API가 없으면 프로필 위치 사용
      const location = { lat: user.latitude, lng: user.longitude };
      console.log("✅ Using user profile location (no geolocation API):", location);
      setUserLocation(location);
      setMapCenter(location);
    }
  }, [user?.latitude, user?.longitude]);

  // 페이지 스크롤 방지 (매장찾기는 고정 레이아웃)
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // 매장 목록 로드
  useEffect(() => {
    const loadStores = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getStoresAction(
          {
            page: 1,
            page_size: PAGE_SIZE,
          },
          accessToken
        );

        if (result.success && result.data) {
          // 백엔드 데이터에 UI용 추가 정보 추가
          const iconColors = [
            { bg: "bg-[#FEF9E7]", color: "text-[#C9A227]" },
            { bg: "bg-blue-100", color: "text-blue-600" },
            { bg: "bg-purple-100", color: "text-purple-600" },
            { bg: "bg-orange-100", color: "text-orange-600" },
            { bg: "bg-green-100", color: "text-green-600" },
            { bg: "bg-pink-100", color: "text-pink-600" },
          ];

          const transformedStores = result.data.stores.map((store, index) => {
            const colorSet = iconColors[index % iconColors.length];

            // 백엔드에서 받은 위도/경도 사용
            const lat = store.latitude || 37.5665;
            const lng = store.longitude || 126.978;

            // 사용자 위치가 있으면 실제 거리 계산
            const distance = userLocation
              ? getDistanceText(userLocation.lat, userLocation.lng, lat, lng)
              : null;

            if (index === 0) {
              console.log("🔍 Distance calculation for first store:");
              console.log("  - User location:", userLocation);
              console.log("  - Store coords:", { lat, lng });
              console.log("  - Calculated distance:", distance);
              console.log("  - Store image_url:", store.image_url);
            }

            // 영업 시간 확인
            const isOpen = checkIfOpen(store.open_time, store.close_time);

            return {
              ...store,
              distance: distance || undefined,
              tags: store.tags || [],
              iconBg: colorSet.bg,
              iconColor: colorSet.color,
              isOpen,
              lat,
              lng,
              isLiked: store.is_liked || false, // API에서 받은 좋아요 상태 사용
            };
          });

          console.log(
            "🗺️ Stores with coordinates:",
            transformedStores.map((s) => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng }))
          );
          console.log(
            "🖼️ Stores with images:",
            transformedStores.map((s) => ({ id: s.id, name: s.name, image_url: s.image_url }))
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
  }, [accessToken]);

  // 사용자 위치 변경 시 거리 재계산
  useEffect(() => {
    if (userLocation && stores.length > 0) {
      console.log("🔄 Recalculating distances for user location:", userLocation);
      setStores((prevStores) =>
        prevStores.map((store, idx) => {
          const distance = getDistanceText(
            userLocation.lat,
            userLocation.lng,
            store.lat || 37.5665,
            store.lng || 126.978
          );
          if (idx === 0) {
            console.log("  - First store distance:", distance);
          }
          return {
            ...store,
            distance: distance || undefined,
          };
        })
      );
      console.log("✅ Distance recalculation complete");
    }
  }, [userLocation]); // ✅ stores.length 제거하여 무한 루프 방지

  // URL 파라미터에서 검색어 처리 (메인 화면의 인기 검색어 클릭 시)
  useEffect(() => {
    const searchParam = searchParams.get("search");
    if (searchParam && stores.length > 0) {
      // 검색어가 있으면 자동으로 검색 실행
      setSearchQuery(searchParam);

      // 검색 결과의 첫 번째 매장으로 지도 이동
      const filtered = stores.filter((store) => {
        const query = searchParam.toLowerCase();
        const searchableText = [
          store.name,
          store.address,
          store.region,
          store.district,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchableText.includes(query);
      });

      if (filtered.length > 0) {
        const firstStore = filtered[0];
        if (firstStore.lat && firstStore.lng) {
          setMapCenter({ lat: firstStore.lat, lng: firstStore.lng });
          handleStoreClick(firstStore);
        }
      }
    }
  }, [searchParams, stores.length, handleStoreClick]); // ✅ handleStoreClick 의존성 추가

  // 좋아요 토글 핸들러
  const handleStoreLike = useCallback(async (storeId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // 부모 클릭 이벤트 방지

    if (!user) {
      toast.error("로그인이 필요합니다");
      router.push("/login");
      return;
    }

    if (!accessToken) {
      toast.error("로그인이 필요합니다");
      router.push("/login");
      return;
    }

    try {
      const result = await toggleStoreLikeAction(storeId, accessToken);

      if (result.success && result.data) {
        // 매장 목록의 좋아요 상태 업데이트
        setStores((prevStores) =>
          prevStores.map((store) =>
            store.id === storeId ? { ...store, isLiked: result.data!.is_liked } : store
          )
        );

        // 선택된 매장이 있으면 해당 매장의 좋아요 상태도 업데이트
        if (selectedStore && selectedStore.id === storeId) {
          setSelectedStore({ ...selectedStore, isLiked: result.data.is_liked });
        }

        toast.success(result.data.is_liked ? "찜 목록에 추가되었습니다" : "찜 목록에서 제거되었습니다");
      } else {
        // 401 Unauthorized 체크 및 자동 로그아웃
        if (checkAndHandleUnauthorized(result)) {
          toast.error(result.error || "로그인이 만료되었습니다");
          return;
        }

        toast.error(result.error || "좋아요 처리에 실패했습니다");
      }
    } catch (error) {
      console.error("Toggle store like error:", error);
      toast.error("좋아요 처리 중 오류가 발생했습니다");
    }
  }, [user, accessToken, router, selectedStore]);

  const filteredStores = useMemo(() => {
    // 1. 필터링
    const filtered = stores.filter((store) => {
      // 검색어 필터 (매장명 + 주소 + 지역)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchableText = [
          store.name,
          store.address,
          store.region,
          store.district,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchableText.includes(query)) {
          return false;
        }
      }

      // 태그 필터
      if (selectedFilter !== "all") {
        // 영업중 필터는 별도 처리
        if (selectedFilter === "open") {
          return store.isOpen === true;
        }

        // 관심매장 필터
        if (selectedFilter === "liked") {
          return store.isLiked === true;
        }

        // 금 매입 필터는 filterTagMap을 사용하여 매칭
        const tagKeywords = filterTagMap[selectedFilter];
        if (tagKeywords) {
          return store.tags?.some((tag) =>
            tagKeywords.some((keyword) =>
              tag.name.toLowerCase().includes(keyword.toLowerCase())
            )
          );
        }
      }

      return true;
    });

    // 2. 정렬
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "distance":
          // 거리 없는 매장은 맨 뒤로
          if (!a.distance && !b.distance) return 0;
          if (!a.distance) return 1;
          if (!b.distance) return -1;

          // "1.2km" -> 1.2로 변환
          const distA = parseFloat(a.distance.replace("km", "").replace("m", "")) / (a.distance.includes("m") && !a.distance.includes("km") ? 1000 : 1);
          const distB = parseFloat(b.distance.replace("km", "").replace("m", "")) / (b.distance.includes("m") && !b.distance.includes("km") ? 1000 : 1);
          return distA - distB;

        default:
          return 0;
      }
    });

    return sorted;
  }, [stores, searchQuery, selectedFilter, sortBy]);

  const filterTags: Array<{ id: FilterTag; label: string }> = [
    { id: "all", label: "전체" },
    { id: "open", label: "영업중" },
    { id: "gold", label: "금 매입" },
    { id: "liked", label: "관심매장" },
  ];

  const closeDetailPanel = () => {
    setIsDetailPanelOpen(false);
    setTimeout(() => setSelectedStore(null), 300); // 애니메이션 후 상태 초기화
  };

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    // 검색 결과가 있으면 첫 번째 매장으로 지도 이동
    if (filteredStores.length > 0) {
      const firstStore = filteredStores[0];
      if (firstStore.lat && firstStore.lng) {
        setMapCenter({ lat: firstStore.lat, lng: firstStore.lng });
        handleStoreClick(firstStore);
        console.log("🔍 Search: Moving to first result -", firstStore.name);
      }
    } else {
      console.log("🔍 Search: No results found");
    }
  }, [filteredStores, handleStoreClick]);

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
      {/* Main Content - 고정 레이아웃 (푸터 숨김) */}
      <div className="fixed inset-0 top-[60px] flex">
        {/* 좌측 패널 - 검색 및 리스트 */}
        <div className="w-full md:w-[420px] lg:w-[480px] flex-shrink-0 border-r border-gray-100 flex flex-col bg-white">
          {/* 검색 영역 */}
          <div className="p-3 md:p-5 border-b border-gray-100">
            {/* 모바일 리스트/지도 탭 */}
            <div className="md:hidden flex gap-2 mb-3">
              <button
                onClick={() => setIsMobileMapOpen(false)}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                  !isMobileMapOpen
                    ? "bg-[#C9A227] text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                리스트
              </button>
              <button
                onClick={() => setIsMobileMapOpen(true)}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                  isMobileMapOpen
                    ? "bg-[#C9A227] text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                지도
              </button>
            </div>

            {/* 검색바 */}
            <form onSubmit={handleSearch}>
              <div className="bg-gray-100 rounded-xl p-1 flex items-center transition-all duration-200 mb-3">
                <div className="flex-1 flex items-center gap-2 md:gap-3 px-2 md:px-3">
                  <Search className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="매장명, 지역, 주소로 검색"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 py-2 md:py-2.5 text-small md:text-body text-gray-900 placeholder-gray-400 bg-transparent outline-none"
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
                <Button
                  type="submit"
                  variant="brand-primary"
                  size="sm"
                  className="rounded-lg"
                >
                  검색
                </Button>
              </div>
            </form>

            {/* 현재 위치 버튼 (데스크탑만) */}
            <button
              type="button"
              onClick={getCurrentLocation}
              className="hidden md:flex w-full items-center justify-center gap-2 py-3 bg-white border border-gray-200 rounded-xl text-caption font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200 mb-4"
            >
              <MapPin className="w-5 h-5 text-blue-500" />
              현재 위치로 검색
            </button>

            {/* 필터 태그 */}
            <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {filterTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    // 관심매장 필터 클릭 시 로그인 여부 확인
                    if (tag.id === "liked" && !user) {
                      toast.error("로그인이 필요합니다");
                      router.push("/login");
                      return;
                    }
                    setSelectedFilter(tag.id);
                  }}
                  className={`px-3 md:px-4 py-2 md:py-2.5 min-h-[40px] md:min-h-[44px] text-small font-medium rounded-full border whitespace-nowrap transition-all duration-200 ${
                    selectedFilter === tag.id
                      ? "bg-[#C9A227] text-white border-[#C9A227] active:bg-[#8A6A00]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400 active:bg-gray-50"
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* 결과 헤더 - 모바일에서 리스트 탭일 때만 표시 */}
          <div className={`px-3 md:px-page py-3 md:py-4 flex items-center justify-between border-b border-gray-50 ${
            isMobileMapOpen ? "hidden md:flex" : "flex"
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-caption text-gray-500">검색결과</span>
              <span className="text-caption font-bold text-gray-900">{filteredStores.length}</span>
            </div>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="appearance-none text-small font-medium text-gray-600 pr-5 cursor-pointer bg-transparent focus:outline-none"
              >
                <option value="distance">거리순</option>
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

          {/* 매장 리스트 - 모바일에서 리스트 탭일 때만 표시 */}
          <div className={`flex-1 overflow-y-auto ${
            isMobileMapOpen ? "hidden md:block" : "block"
          }`}>
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 px-page text-center">
                <StoreIcon className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-[16px] font-semibold text-gray-900 mb-2">오류가 발생했습니다</h3>
                <p className="text-caption text-gray-500 mb-4">{error}</p>
                <Button
                  onClick={() => window.location.reload()}
                  variant="brand-primary"
                  className="min-h-[44px]"
                >
                  다시 시도
                </Button>
              </div>
            ) : filteredStores.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-page text-center">
                <StoreIcon className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-[16px] font-semibold text-gray-900 mb-2">검색 결과가 없습니다</h3>
                <p className="text-caption text-gray-500">
                  다른 검색어를 입력하거나 필터를 변경해보세요
                </p>
              </div>
            ) : (
              <Virtuoso
                data={filteredStores}
                itemContent={(index, store) => (
                  <div
                    onClick={() => handleStoreClick(store)}
                    className={`p-3 md:p-5 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors duration-200 border-l-4 ${
                      selectedStore?.id === store.id
                        ? "bg-gray-50 border-l-gray-900"
                        : "border-l-transparent"
                    }`}
                  >
                    <div className="flex gap-3 md:gap-4">
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden flex-shrink-0">
                        <StoreImage
                          imageUrl={store.image_url}
                          storeName={store.name}
                          iconBg={store.iconBg}
                          iconColor={store.iconColor}
                          size="sm"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-[16px] font-semibold text-gray-900 truncate flex-1">
                            {store.name}
                          </h3>
                          <span className={`px-1.5 py-0.5 text-[11px] font-medium rounded flex-shrink-0 ${
                            store.isOpen
                              ? "bg-[#FEF9E7] text-[#8A6A00]"
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {store.isOpen ? "영업중" : "준비중"}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleStoreLike(store.id, e)}
                            className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Heart
                              className={`w-4 h-4 transition-colors ${
                                store.isLiked ? "fill-red-500 text-red-500" : "text-gray-400"
                              }`}
                            />
                          </button>
                        </div>
                        {store.distance && (
                          <div className="flex items-center gap-1.5 text-small mb-2">
                            <span className="text-blue-600 font-semibold">
                              {store.distance}
                            </span>
                          </div>
                        )}
                        <p className="text-small text-gray-500 mb-2 truncate">
                          {store.address || "주소 정보 없음"}
                        </p>
                        {store.tags && store.tags.length > 0 && (
                          <div className="flex items-center gap-2">
                            {store.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag.id}
                                className="px-2 py-1 bg-gray-100 text-gray-600 text-[11px] font-medium rounded"
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              />
            )}
          </div>
        </div>

        {/* 지도 영역 (중앙) - Kakao Map - 모바일에서 지도 탭일 때 표시 */}
        <div className={`flex-1 relative ${
          isMobileMapOpen ? "flex" : "hidden md:flex"
        }`}>
          <StoreMap
            stores={filteredStores.map((store) => ({
              id: store.id,
              name: store.name,
              lat: store.lat || 37.5665,
              lng: store.lng || 126.978,
              isOpen: store.isOpen,
              tags: store.tags,
              distance: store.distance,
              address: store.address,
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
              <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
                <span className="text-body font-medium text-gray-900">매장 정보</span>
                <button
                  type="button"
                  onClick={closeDetailPanel}
                  className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 사진 갤러리 */}
              <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                <div className="w-full h-48 overflow-hidden flex-shrink-0">
                  <StoreImage
                    imageUrl={selectedStore.image_url}
                    storeName={selectedStore.name}
                    iconBg={selectedStore.iconBg}
                    iconColor={selectedStore.iconColor}
                    size="md"
                  />
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
                        onClick={() => router.push(`/stores/${selectedStore.id}/${selectedStore.slug}`)}
                        className="hover:underline"
                      >
                        <h3 className="text-[20px] font-bold text-gray-900">
                          {selectedStore.name}
                        </h3>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleStoreLike(selectedStore.id, e)}
                      className="w-10 h-10 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                      <Heart
                        className={`w-5 h-5 transition-colors ${
                          selectedStore.isLiked ? "fill-red-500 text-red-500" : "text-gray-400"
                        }`}
                      />
                    </button>
                  </div>
                  {/* 영업 상태 */}
                  <div className="flex items-center gap-2 text-caption">
                    <span className={selectedStore.isOpen ? "text-[#8A6A00] font-medium" : "text-gray-500"}>
                      {selectedStore.isOpen ? "영업중" : "준비중"}
                    </span>
                    {selectedStore.close_time && (
                      <>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-500">{selectedStore.close_time} 마감</span>
                      </>
                    )}
                  </div>
                </div>

                {/* 전문분야 */}
                <div className="py-4 border-b border-gray-100">
                  <h4 className="text-small font-medium text-gray-500 mb-2">전문분야</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedStore.tags && selectedStore.tags.length > 0 ? (
                      selectedStore.tags.slice(0, 5).map((tag, idx) => (
                        <span
                          key={tag.id}
                          className={`px-3 py-1.5 text-small font-medium rounded-full ${
                            idx === 0
                              ? "bg-[#C9A227] text-white"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {tag.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-small text-gray-500">태그 없음</span>
                    )}
                  </div>
                </div>

                {/* 위치 & 연락처 */}
                <div className="py-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-caption text-gray-900">
                          {selectedStore.address || "주소 정보 없음"}
                        </p>
                        {selectedStore.distance && (
                          <p className="text-small text-blue-600 font-medium">
                            {selectedStore.distance}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <p className="text-caption text-gray-900">
                        {selectedStore.phone_number || "전화번호 정보 없음"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <p className="text-caption text-gray-900">
                        {selectedStore.open_time && selectedStore.close_time
                          ? `${selectedStore.open_time} - ${selectedStore.close_time}`
                          : "영업시간 정보 없음"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 매장 상세보기 버튼 */}
                <Button
                  type="button"
                  onClick={() => router.push(`/stores/${selectedStore.id}/${selectedStore.slug}`)}
                  variant="brand-primary"
                  size="lg"
                  className="w-full"
                >
                  매장 상세보기
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Suspense로 감싼 메인 export 컴포넌트
export default function StoresPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 top-[60px] flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">매장 정보를 불러오는 중...</p>
        </div>
      </div>
    }>
      <StoresPageContent />
    </Suspense>
  );
}
