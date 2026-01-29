"use client";

import { useState, useEffect, useMemo, useCallback, Suspense, memo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Search,
  MapPin,
  X,
  Heart,
  Store as StoreIcon,
  Phone,
  Clock,
  BadgeCheck,
  Building2,
} from "lucide-react";
import { getStoresAction, toggleStoreLikeAction } from "@/actions/stores";
import type { StoreDetail, Tag } from "@/types/stores";
import StoreMap from "@/components/StoreMap";
import useKakaoLoader from "@/hooks/useKakaoLoader";
import { getDistanceText } from "@/utils/distance";
import { useAuthStore } from "@/stores/useAuthStore";
import { useLocationStore } from "@/stores/useLocationStore";
import { toast } from "sonner";
import { useAuthenticatedAction } from "@/hooks/useAuthenticatedAction";
import { Button } from "@/components/ui/button";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { StoreListSkeleton } from "@/components/skeletons/StoreListSkeleton";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";
import { isWebView } from "@/lib/webview";

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
  const isBase64 = imageUrl.startsWith("data:");

  return (
    <div className={`${sizeClasses[size]} bg-white flex items-center justify-center overflow-hidden relative`}>
      <Image
        src={imageUrl}
        alt={storeName}
        fill
        className="object-cover"
        sizes={size === "sm" ? "80px" : size === "md" ? "400px" : "100vw"}
        quality={75}
        loading="lazy"
        unoptimized
        onError={() => setImageError(true)}
      />
    </div>
  );
});

const PAGE_SIZE = 20;

// 페이지를 dynamic으로 설정 (useSearchParams 사용을 위해)
export const dynamic = 'force-dynamic';

type FilterTag = "all" | "open" | "liked" | "managed" | "verified";


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
  const { currentLocation } = useLocationStore();
  const accessToken = tokens?.access_token;
  const { checkAndHandleUnauthorized } = useAuthenticatedAction();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || ""); // input 필드 값
  const [appliedSearchQuery, setAppliedSearchQuery] = useState(searchParams.get("search") || ""); // 실제 적용된 검색어
  const [selectedFilter, setSelectedFilter] = useState<FilterTag>("all");
  const [selectedStore, setSelectedStore] = useState<StoreWithExtras | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [isMobileMapOpen, setIsMobileMapOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"distance">("distance");
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 37.5665,
    lng: 126.978,
  }); // 서울시청 기본 좌표
  const [mapLevel, setMapLevel] = useState<number>(5); // 지도 줌 레벨 (1~14, 작을수록 확대)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [stores, setStores] = useState<StoreWithExtras[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [inWebView, setInWebView] = useState(false);
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null); // 지도 기반 검색 중심점
  const [searchRadius, setSearchRadius] = useState<number>(2); // 검색 반경 (km)
  const [searchPending, setSearchPending] = useState(false); // 검색 진행 중
  const [lastSearchQuery, setLastSearchQuery] = useState<string>(""); // 마지막 검색어
  const virtuosoRef = useRef<VirtuosoHandle>(null); // Virtuoso 스크롤 제어용 ref

  // 웹뷰 환경 감지
  useEffect(() => {
    setInWebView(isWebView());
  }, []);

  // 매장 클릭 핸들러 (useCallback으로 메모이제이션)
  const handleStoreClick = useCallback((store: StoreWithExtras) => {
    // 매장 선택 상태로 변경
    setSelectedStore(store);

    // 모바일에서는 지도 탭으로 전환
    if (window.innerWidth < 768) {
      setIsMobileMapOpen(true);
    } else {
      // PC에서는 우측 패널 열기
      setIsDetailPanelOpen(true);
    }

    // 선택된 매장 위치로 지도 중심 이동
    if (store.lat && store.lng) {
      setMapCenter({ lat: store.lat, lng: store.lng });
    }
  }, []);

  // 초기 로드 시 사용자 위치 자동 획득 (비침입적)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const location = { lat: latitude, lng: longitude };
          setUserLocation(location);
          setMapCenter(location);
        },
        (error) => {
          // GPS 실패 시 사용자 프로필의 위경도 사용
          if (user?.latitude !== undefined && user?.longitude !== undefined) {
            const location = { lat: user.latitude, lng: user.longitude };
            setUserLocation(location);
            setMapCenter(location);
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
      setUserLocation(location);
      setMapCenter(location);
    }
  }, [user?.latitude, user?.longitude]);

  // 페이지 스크롤 방지 (데스크톱에서만 고정 레이아웃)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');

    const updateOverflow = () => {
      if (mediaQuery.matches) {
        // 데스크톱: 스크롤 방지
        document.body.style.overflow = "hidden";
      } else {
        // 모바일: 스크롤 허용
        document.body.style.overflow = "unset";
      }
    };

    updateOverflow();
    mediaQuery.addEventListener('change', updateOverflow);

    return () => {
      document.body.style.overflow = "unset";
      mediaQuery.removeEventListener('change', updateOverflow);
    };
  }, []);

  // 매장 목록 로드 (currentPage, selectedFilter, userLocation, searchCenter 변경 시마다 실행)
  useEffect(() => {
    const loadStores = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 필터에 따른 API 파라미터 설정
        const params: any = {
          page: currentPage,
          page_size: PAGE_SIZE,
        };

        if (searchCenter) {
          params.center_lat = searchCenter.lat;
          params.center_lng = searchCenter.lng;
          params.radius = searchRadius * 1000;
        } else if (userLocation) {
          params.user_lat = userLocation.lat;
          params.user_lng = userLocation.lng;
        }

        if (appliedSearchQuery) {
          params.search = appliedSearchQuery;
        }

        if (selectedFilter === "verified") {
          params.is_verified = true;
        } else if (selectedFilter === "managed") {
          params.is_managed = true;
        }

        const result = await getStoresAction(params, accessToken);

        if (result.success && result.data) {
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
            const lat = store.latitude || 37.5665;
            const lng = store.longitude || 126.978;
            const distance = userLocation
              ? getDistanceText(userLocation.lat, userLocation.lng, lat, lng)
              : null;
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
              isLiked: store.is_liked || false,
            };
          });

          setStores(transformedStores);
          setTotalCount(result.data.count);
        } else {
          setError(result.error || "매장 목록을 불러올 수 없습니다.");
        }
      } catch (err) {
        setError("매장 목록을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
        setSearchPending(false);
      }
    };

    loadStores();
  }, [accessToken, currentPage, selectedFilter, appliedSearchQuery, userLocation, searchCenter, searchRadius]);

  // URL 파라미터에서 검색어 처리
  useEffect(() => {
    const searchParam = searchParams.get("search");
    if (searchParam && searchParam !== appliedSearchQuery) {
      setSearchQuery(searchParam);
      setAppliedSearchQuery(searchParam);
      setSearchPending(true);
      setLastSearchQuery(`"${searchParam}"`);
      setCurrentPage(1);
      setSearchCenter(null);
    }
  }, [searchParams]);

  // 검색 결과 로드 후 첫 번째 매장으로 이동
  useEffect(() => {
    const searchParam = searchParams.get("search");
    if (searchParam && stores.length > 0 && !selectedStore) {
      const firstStore = stores[0];
      if (firstStore.lat && firstStore.lng) {
        setMapCenter({ lat: firstStore.lat, lng: firstStore.lng });
        handleStoreClick(firstStore);
      }
    }
  }, [stores, searchParams, selectedStore, handleStoreClick]); // selectedStore 제외

  // 좋아요 토글 핸들러
  const handleStoreLike = useCallback(async (storeId: number, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user || !accessToken) {
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
    return stores.filter((store) => {
      if (selectedFilter === "open") {
        return store.is_managed === true && store.isOpen === true;
      }
      if (selectedFilter === "liked") {
        return store.isLiked === true;
      }
      return true;
    });
  }, [stores, selectedFilter]);

  const filterTags: Array<{ id: FilterTag; label: string }> = [
    { id: "all", label: "전체" },
    { id: "verified", label: "인증매장" },
    { id: "managed", label: "관리매장" },
    { id: "open", label: "영업중" },
    { id: "liked", label: "관심매장" },
  ];

  const closeDetailPanel = () => {
    setIsDetailPanelOpen(false);
    setTimeout(() => setSelectedStore(null), 300);
  };

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      toast.error("검색어를 입력해주세요");
      return;
    }
    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
      setAppliedSearchQuery(searchQuery);
      setCurrentPage(1);
      setSearchCenter(null);
      toast.info("매장명으로 검색합니다");
      return;
    }

    const geocoder = new window.kakao.maps.services.Geocoder();
    const places = new window.kakao.maps.services.Places();

    const getZoomLevelForAddress = (addressName: string) => {
      if (/^(서울|부산|대구|인천|광주|대전|울산|세종|경기도|강원도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|제주)/.test(addressName)) {
        return 9;
      }
      if (/[시군구]/.test(addressName)) {
        return 6;
      }
      if (/[동읍면]/.test(addressName)) {
        return 5;
      }
      return 6;
    };
    geocoder.addressSearch(searchQuery, (addressResult: any, addressStatus: any) => {
      if (addressStatus === window.kakao.maps.services.Status.OK && addressResult.length > 0) {
        const location = {
          lat: parseFloat(addressResult[0].y),
          lng: parseFloat(addressResult[0].x),
        };

        const addressName = addressResult[0].address_name;
        const zoomLevel = getZoomLevelForAddress(addressName);
        setMapCenter(location);
        setMapLevel(zoomLevel);

        // 해당 위치 기준으로 매장 검색
        setSearchCenter(location);
        setCurrentPage(1);
        setAppliedSearchQuery("");
        setSearchPending(true);
        setLastSearchQuery(`${addressName} 지역`);

        if (window.innerWidth < 768) {
          setIsMobileMapOpen(true);
        }

        toast.loading(`${addressName} 지역 매장을 검색하는 중...`);
        return;
      }
      places.keywordSearch(searchQuery, (placeResult: any, placeStatus: any) => {
        if (placeStatus === window.kakao.maps.services.Status.OK && placeResult.length > 0) {
          const firstPlace = placeResult[0];
          const location = {
            lat: parseFloat(firstPlace.y),
            lng: parseFloat(firstPlace.x),
          };
          setMapCenter(location);
          setMapLevel(4);

          // 해당 위치 기준으로 매장 검색
          setSearchCenter(location);
          setCurrentPage(1);
          setAppliedSearchQuery("");
          setSearchPending(true);
          setLastSearchQuery(`${firstPlace.place_name} 근처`);

          if (window.innerWidth < 768) {
            setIsMobileMapOpen(true);
          }

          toast.loading(`${firstPlace.place_name} 근처 매장을 검색하는 중...`);
          return;
        }
        setAppliedSearchQuery(searchQuery);
        setCurrentPage(1);
        setSearchCenter(null);
        setSearchPending(true);
        setLastSearchQuery(`"${searchQuery}"`);

        if (window.innerWidth < 768) {
          setIsMobileMapOpen(false);
        }

        toast.loading(`"${searchQuery}" 매장명으로 검색하는 중...`);
      });
    });
  }, [searchQuery]);

  useEffect(() => {
    if (!searchPending && lastSearchQuery && !isLoading) {
      const hasResults = stores.length > 0;

      if (hasResults) {
        toast.dismiss();
        toast.success(`${lastSearchQuery}에서 ${stores.length}개 매장을 찾았습니다`);
      } else {
        toast.dismiss();
        toast.error(`${lastSearchQuery}에서 매장을 찾지 못했습니다`);
      }

      setLastSearchQuery("");
    }
  }, [searchPending, lastSearchQuery, isLoading, stores.length]);
  useEffect(() => {
    if (selectedStore && virtuosoRef.current && window.innerWidth >= 768) {
      const index = filteredStores.findIndex(s => s.id === selectedStore.id);
      if (index !== -1) {
        virtuosoRef.current.scrollToIndex({
          index,
          align: 'center',
          behavior: 'smooth',
        });
      }
    }
  }, [selectedStore, filteredStores]);

  useEffect(() => {
    if (selectedStore && window.innerWidth < 768 && !isMobileMapOpen) {
      const element = document.querySelector(`[data-store-id="${selectedStore.id}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedStore, isMobileMapOpen]);

  const handleSearchThisArea = useCallback((center: { lat: number; lng: number }, level: number) => {
    const radiusFromLevel = (level: number) => {
      if (level <= 3) return 1;
      if (level <= 5) return 2;
      if (level <= 7) return 5;
      if (level <= 9) return 10;
      return 20;
    };

    const newRadius = radiusFromLevel(level);

    setSearchCenter(center);
    setSearchRadius(newRadius);
    setCurrentPage(1);
    setAppliedSearchQuery("");
    setSearchQuery("");
    setSearchPending(true);
    setLastSearchQuery(`현재 지역 (반경 ${newRadius}km)`);
    toast.loading(`현재 지역 (반경 ${newRadius}km) 매장을 검색하는 중...`);
  }, []);

  // 현재 위치 가져오기 (Geolocation API 사용, 실패 시 설정된 위치 폴백)
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      // Geolocation을 지원하지 않는 경우, 앱뷰라면 설정된 위치 사용
      if (inWebView && currentLocation) {
        setSearchQuery(currentLocation);
        setAppliedSearchQuery(currentLocation);
        setCurrentPage(1);
        setSearchCenter(null); // 지도 기반 검색 비활성화
        toast.success(`${currentLocation} 지역 매장을 검색합니다`);
      } else {
        alert("이 브라우저에서는 위치 정보를 지원하지 않습니다.");
      }
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const location = { lat: latitude, lng: longitude };
        setUserLocation(location);
        setMapCenter(location);
        setSearchCenter(null); // 지도 기반 검색 비활성화
        setIsGettingLocation(false);
        toast.success("현재 위치로 매장을 검색합니다");
      },
      (error) => {
        console.error("위치 정보를 가져올 수 없습니다:", error);
        setIsGettingLocation(false);

        // 앱뷰이고 위치 권한 실패 시, 설정된 위치를 폴백으로 사용
        if (inWebView && currentLocation) {
          setSearchQuery(currentLocation);
          setAppliedSearchQuery(currentLocation);
          setCurrentPage(1);
          setSearchCenter(null); // 지도 기반 검색 비활성화
          toast.success(`${currentLocation} 지역 매장을 검색합니다`);
          return;
        }

        // 폴백 위치가 없는 경우 에러 메시지 표시
        let errorMessage = "위치 정보를 가져올 수 없습니다.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = inWebView
            ? "위치 권한이 거부되었습니다. 상단의 위치 아이콘을 눌러 위치를 설정해주세요."
            : "위치 권한을 허용해주세요.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = "위치 정보를 사용할 수 없습니다.";
        } else if (error.code === error.TIMEOUT) {
          errorMessage = "위치 정보를 가져오는 데 시간이 초과되었습니다.";
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

  // Pull to Refresh 핸들러
  const handleRefresh = async () => {
    // 페이지를 1로 리셋하면 useEffect가 자동으로 재실행됨
    setCurrentPage(1);
    // 약간의 지연을 추가하여 새로고침 애니메이션이 보이도록
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  // Pull to Refresh 훅
  const pullToRefreshState = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    disabled: isLoading || isGettingLocation, // 로딩 중에는 비활성화
  });

  // 지도에서 매장 마커 클릭 시
  const handleMapStoreClick = (store: { id: number; name: string; lat: number; lng: number }) => {
    const fullStore = stores.find((s) => s.id === store.id);
    if (fullStore) {
      handleStoreClick(fullStore);
    }
  };

  // 지도 인포윈도우 닫기
  const handleMapStoreClose = useCallback(() => {
    setIsDetailPanelOpen(false);
    setTimeout(() => setSelectedStore(null), 300); // 애니메이션 후 상태 초기화
  }, []);

  // 페이지 변경 핸들러
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // 리스트 최상단으로 스크롤
    const listElement = document.querySelector('.stores-list');
    if (listElement) {
      listElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 총 페이지 수 계산
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <>
      {/* Pull to Refresh 인디케이터 */}
      <PullToRefreshIndicator {...pullToRefreshState} />

      {/* 모바일 리스트/지도 탭 - 좌측 패널 밖으로 이동 */}
      <div className={`md:hidden bg-white border-b border-gray-100 ${inWebView ? "p-2" : "p-3"}`}>
        <div className={`flex gap-2`}>
          <button
            onClick={() => setIsMobileMapOpen(false)}
            className={`flex-1 font-semibold rounded-lg transition-colors ${
              inWebView ? "py-2 text-xs" : "py-2.5 text-sm"
            } ${
              !isMobileMapOpen
                ? "bg-[#C9A227] text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            리스트
          </button>
          <button
            onClick={() => setIsMobileMapOpen(true)}
            className={`flex-1 font-semibold rounded-lg transition-colors ${
              inWebView ? "py-2 text-xs" : "py-2.5 text-sm"
            } ${
              isMobileMapOpen
                ? "bg-[#C9A227] text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            지도
          </button>
        </div>
      </div>

      {/* Main Content - 모바일에서는 일반 스크롤, 데스크톱에서는 고정 레이아웃 */}
      <div className={`md:fixed md:inset-0 md:top-[60px] flex flex-col md:flex-row ${
        isMobileMapOpen ? "h-[calc(100vh-120px)]" : ""
      }`}>
        {/* 좌측 패널 - 검색 및 리스트 */}
        <div className={`w-full md:w-[420px] lg:w-[480px] flex-shrink-0 md:border-r border-gray-100 bg-white ${
          isMobileMapOpen ? "hidden md:flex md:flex-col" : "flex flex-col"
        }`}>
          {/* 검색 영역 */}
          <div className={`border-b border-gray-100 ${inWebView ? "p-2" : "p-3 md:p-5"}`}>

            {/* 검색바 */}
            <form onSubmit={handleSearch}>
              <div className={`bg-gray-100 rounded-xl flex items-center transition-all duration-200 ${
                inWebView ? "p-0.5 mb-2" : "p-1 mb-3"
              }`}>
                <div className={`flex-1 min-w-0 flex items-center ${inWebView ? "gap-1.5 px-2" : "gap-2 md:gap-3 px-2 md:px-3"}`}>
                  <Search className={`flex-shrink-0 text-gray-400 ${inWebView ? "w-3.5 h-3.5" : "w-4 h-4 md:w-5 md:h-5"}`} />
                  <input
                    type="text"
                    placeholder={inWebView ? "매장명 검색" : "매장명, 지역, 주소로 검색"}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`flex-1 min-w-0 text-gray-900 placeholder-gray-400 bg-transparent outline-none ${
                      inWebView ? "py-1.5 text-xs" : "py-2 md:py-2.5 text-small md:text-body"
                    }`}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="flex-shrink-0 p-1 hover:bg-gray-200 rounded-full transition-colors"
                    >
                      <X className={`text-gray-400 ${inWebView ? "w-3 h-3" : "w-4 h-4"}`} />
                    </button>
                  )}
                </div>
                <Button
                  type="submit"
                  variant="brand-primary"
                  size={inWebView ? "xs" : "sm"}
                  className={`flex-shrink-0 rounded-lg ${inWebView ? "px-2 text-xs" : ""}`}
                >
                  검색
                </Button>
              </div>
            </form>

            {/* 현재 위치 버튼 */}
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
              className={`flex w-full items-center justify-center gap-2 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-white ${
                inWebView ? "py-2 min-h-[40px] text-[11px] mb-2" : "py-3 min-h-[48px] text-caption mb-4"
              }`}
            >
              {isGettingLocation ? (
                <>
                  <div className={`border-2 border-blue-500 border-t-transparent rounded-full animate-spin ${
                    inWebView ? "w-4 h-4" : "w-5 h-5"
                  }`} />
                  위치 확인 중...
                </>
              ) : (
                <>
                  <MapPin className={`text-blue-500 ${inWebView ? "w-4 h-4" : "w-5 h-5"}`} />
                  현재 위치로 검색
                </>
              )}
            </button>

            {/* 필터 태그 */}
            <div className={`flex items-center overflow-x-auto pb-1 scrollbar-hide ${
              inWebView ? "gap-1" : "gap-1.5 md:gap-2"
            }`}>
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
                    setCurrentPage(1); // 필터 변경 시 1페이지로 리셋
                    // 검색 상태 유지 (searchCenter, appliedSearchQuery 유지)
                  }}
                  className={`font-medium rounded-full border whitespace-nowrap transition-all duration-200 ${
                    inWebView ? "px-2.5 py-1.5 min-h-[32px] text-[11px]" : "px-3 md:px-4 py-2 md:py-2.5 min-h-[40px] md:min-h-[44px] text-small"
                  } ${
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
          <div className={`flex items-center justify-between border-b border-gray-50 ${
            inWebView ? "px-2 py-2" : "px-3 md:px-page py-3 md:py-4"
          } ${
            isMobileMapOpen ? "hidden md:flex" : "flex"
          }`}>
            <div className="flex items-center gap-2">
              {searchCenter ? (
                <>
                  <span className={`text-[#C9A227] font-medium ${inWebView ? "text-[11px]" : "text-caption"}`}>
                    📍 지도 검색 (반경 {searchRadius}km)
                  </span>
                  <span className={`text-gray-500 ${inWebView ? "text-[11px]" : "text-caption"}`}>·</span>
                  <span className={`font-bold text-gray-900 ${inWebView ? "text-[11px]" : "text-caption"}`}>
                    {filteredStores.length}개
                  </span>
                  <button
                    onClick={() => {
                      setSearchCenter(null);
                      setCurrentPage(1);
                      toast.info("지도 검색이 해제되었습니다");
                    }}
                    className={`ml-1 text-gray-400 hover:text-gray-600 transition-colors ${
                      inWebView ? "p-0.5" : "p-1"
                    }`}
                    title="지도 검색 해제"
                  >
                    <X className={inWebView ? "w-3 h-3" : "w-4 h-4"} />
                  </button>
                </>
              ) : (
                <>
                  <span className={`text-gray-500 ${inWebView ? "text-[11px]" : "text-caption"}`}>검색결과</span>
                  <span className={`font-bold text-gray-900 ${inWebView ? "text-[11px]" : "text-caption"}`}>
                    {filteredStores.length}개
                  </span>
                </>
              )}
            </div>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className={`appearance-none font-medium text-gray-600 pr-5 cursor-pointer bg-transparent focus:outline-none ${
                  inWebView ? "text-[11px]" : "text-small"
                }`}
              >
                <option value="distance">거리순</option>
              </select>
              <svg
                className={`absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${
                  inWebView ? "w-3 h-3" : "w-4 h-4"
                }`}
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
          <div className={`${
            isMobileMapOpen ? "hidden md:flex md:flex-1 md:flex-col" : "flex md:flex-1 flex-col"
          }`}>
            <div className="flex-1 md:overflow-y-auto stores-list">
            {isGettingLocation ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-caption text-gray-600">현재 위치를 확인하는 중입니다...</p>
              </div>
            ) : (isLoading || searchPending) ? (
              <StoreListSkeleton count={8} />
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
            ) : stores.length === 0 ? (
              // 백엔드 검색 결과가 없음
              <div className="flex flex-col items-center justify-center py-20 px-page text-center">
                <StoreIcon className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-[16px] font-semibold text-gray-900 mb-2">검색 결과가 없습니다</h3>
                {searchCenter ? (
                  <>
                    <p className="text-caption text-gray-500 mb-4">
                      이 지역 반경 {searchRadius}km 내에 매장이 없습니다
                    </p>
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => {
                          const newRadius = searchRadius * 2; // 현재 반경의 2배로 확대
                          setSearchRadius(newRadius);
                          setCurrentPage(1);
                          setSearchPending(true);
                          setLastSearchQuery(`반경 ${newRadius}km`);
                          toast.loading(`검색 반경을 ${newRadius}km로 확대하는 중...`);
                        }}
                        variant="outline"
                        className="min-h-[44px]"
                      >
                        반경 {searchRadius * 2}km로 확대
                      </Button>
                      <Button
                        onClick={() => {
                          setSearchCenter(null);
                          setAppliedSearchQuery("");
                          setSearchQuery("");
                          setCurrentPage(1);
                          toast.info("지도 검색이 해제되었습니다");
                        }}
                        variant="outline"
                        className="min-h-[44px]"
                      >
                        전체 매장 보기
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-caption text-gray-500">
                    다른 검색어를 입력하거나 필터를 변경해보세요
                  </p>
                )}
              </div>
            ) : filteredStores.length === 0 ? (
              // 백엔드 결과는 있지만 클라이언트 필터(영업중, 관심매장)로 걸러짐
              <div className="flex flex-col items-center justify-center py-20 px-page text-center">
                <StoreIcon className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-[16px] font-semibold text-gray-900 mb-2">
                  {selectedFilter === "open" ? "영업중인 매장이 없습니다" : "관심 매장이 없습니다"}
                </h3>
                <p className="text-caption text-gray-500 mb-4">
                  총 {stores.length}개 매장 중 조건에 맞는 매장이 없습니다
                </p>
                <Button
                  onClick={() => {
                    setSelectedFilter("all");
                    toast.info("필터가 해제되었습니다");
                  }}
                  variant="outline"
                  className="min-h-[44px]"
                >
                  전체 매장 보기
                </Button>
              </div>
            ) : (
              <>
                {/* 모바일: 일반 렌더링 */}
                <div className="md:hidden">
                  {filteredStores.map((store) => (
                    <div
                      key={store.id}
                      data-store-id={store.id}
                      className={`border-b border-gray-100 transition-colors duration-200 border-l-4 ${
                        inWebView ? "p-2" : "p-3"
                      } ${
                        selectedStore?.id === store.id
                          ? "bg-gray-50 border-l-gray-900"
                          : "border-l-transparent"
                      }`}
                    >
                      <div
                        onClick={() => handleStoreClick(store)}
                        className="cursor-pointer hover:bg-gray-50 -m-2 p-2 md:-m-3 md:p-3 rounded-lg"
                      >
                        <div className={`flex ${inWebView ? "gap-2" : "gap-3"}`}>
                          <div className={`rounded-xl overflow-hidden flex-shrink-0 ${
                            inWebView ? "w-14 h-14" : "w-16 h-16"
                          }`}>
                            <StoreImage
                              imageUrl={store.image_url}
                              storeName={store.name}
                              iconBg={store.iconBg}
                              iconColor={store.iconColor}
                              size="sm"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                          <div className={`flex items-center gap-2 ${inWebView ? "mb-0.5" : "mb-1"}`}>
                            <h3 className={`font-semibold text-gray-900 truncate flex-1 ${
                              inWebView ? "text-sm" : "text-[16px]"
                            }`}>
                              {store.name}
                            </h3>
                            {store.is_verified && (
                              <span className={`inline-flex items-center bg-blue-50 text-blue-700 font-semibold rounded flex-shrink-0 ${
                                inWebView ? "gap-0.5 px-1 py-0.5 text-[9px]" : "gap-0.5 px-1.5 py-0.5 text-[11px]"
                              }`}>
                                <BadgeCheck className={inWebView ? "w-2.5 h-2.5" : "w-3 h-3"} />
                                인증
                              </span>
                            )}
                            {store.is_managed && !store.is_verified && (
                              <span className={`inline-flex items-center bg-gray-100 text-gray-600 font-medium rounded flex-shrink-0 ${
                                inWebView ? "gap-0.5 px-1 py-0.5 text-[9px]" : "gap-0.5 px-1.5 py-0.5 text-[11px]"
                              }`}>
                                <Building2 className={inWebView ? "w-2.5 h-2.5" : "w-3 h-3"} />
                                관리
                              </span>
                            )}
                            <span className={`font-medium rounded flex-shrink-0 ${
                              inWebView ? "px-1 py-0.5 text-[9px]" : "px-1.5 py-0.5 text-[11px]"
                            } ${
                              store.isOpen
                                ? "bg-[#FEF9E7] text-[#8A6A00]"
                                : "bg-gray-100 text-gray-600"
                            }`}>
                              {store.isOpen ? "영업중" : "준비중"}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleStoreLike(store.id, e)}
                              className={`flex-shrink-0 hover:bg-gray-100 rounded-lg transition-colors ${
                                inWebView ? "p-0.5" : "p-1"
                              }`}
                            >
                              <Heart
                                className={`transition-colors ${
                                  inWebView ? "w-3.5 h-3.5" : "w-4 h-4"
                                } ${
                                  store.isLiked ? "fill-red-500 text-red-500" : "text-gray-400"
                                }`}
                              />
                            </button>
                          </div>
                          {store.distance && (
                            <div className={`flex items-center ${inWebView ? "gap-1 text-[11px] mb-1" : "gap-1.5 text-small mb-2"}`}>
                              <span className="text-blue-600 font-semibold">
                                {store.distance}
                              </span>
                            </div>
                          )}
                          <p className={`text-gray-500 truncate ${
                            inWebView ? "text-[11px] mb-1" : "text-small mb-2"
                          }`}>
                            {store.district || store.dong || store.building_name ? (
                              <>
                                {store.district && <span>{store.district} </span>}
                                {store.dong && <span className="font-medium">{store.dong}</span>}
                                {store.building_name && <span> ({store.building_name})</span>}
                              </>
                            ) : store.address ? (
                              store.address
                            ) : (
                              "주소 정보 없음"
                            )}
                          </p>
                          {store.tags && store.tags.length > 0 && (
                            <div className={`flex items-center ${inWebView ? "gap-1" : "gap-2"}`}>
                              {store.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag.id}
                                  className={`bg-gray-100 text-gray-600 font-medium rounded ${
                                    inWebView ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[11px]"
                                  }`}
                                >
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      </div>

                      {/* 상세보기 버튼 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/stores/${store.id}/${store.slug}`);
                        }}
                        className={`w-full mt-2 bg-[#C9A227] hover:bg-[#8A6A00] text-white font-medium rounded-lg transition-colors ${
                          inWebView ? "py-1.5 text-xs" : "py-2 text-sm"
                        }`}
                      >
                        상세보기
                      </button>
                    </div>
                  ))}
                </div>

                {/* 데스크톱: Virtuoso로 최적화 */}
                <div className="hidden md:block md:h-full">
                  <Virtuoso
                    ref={virtuosoRef}
                    data={filteredStores}
                    itemContent={(_index, store) => (
                      <div
                        onClick={() => handleStoreClick(store)}
                        className={`border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors duration-200 border-l-4 p-5 ${
                          selectedStore?.id === store.id
                            ? "bg-gray-50 border-l-gray-900"
                            : "border-l-transparent"
                        }`}
                      >
                        <div className="flex gap-4">
                          <div className="rounded-xl overflow-hidden flex-shrink-0 w-20 h-20">
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
                              <h3 className="font-semibold text-gray-900 truncate flex-1 text-[16px]">
                                {store.name}
                              </h3>
                              {store.is_verified && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded flex-shrink-0 text-[11px]">
                                  <BadgeCheck className="w-3 h-3" />
                                  인증
                                </span>
                              )}
                              {store.is_managed && !store.is_verified && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 text-gray-600 font-medium rounded flex-shrink-0 text-[11px]">
                                  <Building2 className="w-3 h-3" />
                                  관리
                                </span>
                              )}
                              <span className={`px-1.5 py-0.5 font-medium rounded flex-shrink-0 text-[11px] ${
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
                            <p className="text-gray-500 truncate text-small mb-2">
                              {store.district || store.dong || store.building_name ? (
                                <>
                                  {store.district && <span>{store.district} </span>}
                                  {store.dong && <span className="font-medium">{store.dong}</span>}
                                  {store.building_name && <span> ({store.building_name})</span>}
                                </>
                              ) : store.address ? (
                                store.address
                              ) : (
                                "주소 정보 없음"
                              )}
                            </p>
                            {store.tags && store.tags.length > 0 && (
                              <div className="flex items-center gap-2">
                                {store.tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag.id}
                                    className="px-2 py-1 bg-gray-100 text-gray-600 font-medium rounded text-[11px]"
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
                </div>
              </>
            )}
            </div>

            {/* 페이지네이션 */}
            {!isLoading && !error && stores.length > 0 && (
              <div className={`border-t border-gray-100 flex items-center justify-between bg-white ${
                inWebView ? "p-2" : "p-3 md:p-5"
              }`}>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`font-medium rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                    inWebView ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
                  }`}
                >
                  이전
                </button>
                <span className={`text-gray-600 ${inWebView ? "text-xs" : "text-sm"}`}>
                  {currentPage} / {totalPages > 0 ? totalPages : 1} 페이지 (총 {totalCount}개)
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className={`font-medium rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                    inWebView ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
                  }`}
                >
                  다음
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 지도 영역 (중앙) - Kakao Map - 모바일에서 지도 탭일 때 표시 */}
        <div className={`${
          isMobileMapOpen ? "block w-full h-full" : "hidden md:flex md:flex-1"
        }`}>
          <StoreMap
            stores={filteredStores.map((store) => ({
              id: store.id,
              name: store.name,
              slug: store.slug,
              lat: store.lat || 37.5665,
              lng: store.lng || 126.978,
              isOpen: store.isOpen,
              tags: store.tags,
              distance: store.distance,
              address: store.address,
              is_verified: store.is_verified,
              is_managed: store.is_managed,
            }))}
            selectedStoreId={selectedStore?.id}
            onStoreClick={handleMapStoreClick}
            onStoreClose={handleMapStoreClose}
            center={mapCenter}
            level={mapLevel}
            onCenterChange={setMapCenter}
            onSearchThisArea={handleSearchThisArea}
            userLocation={userLocation}
            isDetailPanelOpen={isDetailPanelOpen}
            searchCenter={searchCenter}
            searchRadius={searchRadius}
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
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          type="button"
                          onClick={() => router.push(`/stores/${selectedStore.id}/${selectedStore.slug}`)}
                          className="hover:underline"
                        >
                          <h3 className="text-[20px] font-bold text-gray-900">
                            {selectedStore.name}
                          </h3>
                        </button>
                        {/* 인증 매장 뱃지 */}
                        {selectedStore.is_verified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-semibold rounded">
                            <BadgeCheck className="w-3.5 h-3.5" />
                            인증 매장
                          </span>
                        )}
                        {/* 관리 매장 뱃지 (인증되지 않은 경우) */}
                        {selectedStore.is_managed && !selectedStore.is_verified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-[11px] font-medium rounded">
                            <Building2 className="w-3.5 h-3.5" />
                            관리 매장
                          </span>
                        )}
                      </div>
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
                  {/* 영업 상태는 관리매장만 표시 */}
                  {selectedStore.is_managed && (
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
                  )}
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
                        {/* 매장 상세: 전체 주소 표시 */}
                        <p className="text-caption text-gray-900">
                          {selectedStore.address ? (
                            <>
                              {selectedStore.address}
                              {selectedStore.building_name && ` (${selectedStore.building_name})`}
                            </>
                          ) : (
                            "주소 정보 없음"
                          )}
                        </p>
                        {selectedStore.distance && (
                          <p className="text-small text-blue-600 font-medium mt-1">
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
