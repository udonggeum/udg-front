"use client";

import { useState, useEffect, Suspense, useRef, useCallback, useMemo, memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { getPostsAction } from "@/actions/community";
import { getStoreLocationsAction } from "@/actions/stores";
import { useAuthStore } from "@/stores/useAuthStore";
import { Button } from "@/components/ui/button";
import type {
  PostCategory,
  PostType,
  PostListResponse,
} from "@/types/community";
import { Search, SlidersHorizontal, MapPin, X, ChevronDown, Heart, MessageCircle, Store as StoreIcon } from "lucide-react";
import { getUserDisplayName, getUserImageUrl } from "@/lib/utils";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";
import { isWebView } from "@/lib/webview";

type MainCategory = "market" | "community";

// 스켈레톤 로딩 컴포넌트 - React.memo로 최적화
const SkeletonCard = memo(function SkeletonCard({ viewMode }: { viewMode: "grid" | "list" }) {
  if (viewMode === "grid") {
    return (
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
        <div className="w-full aspect-[4/3] bg-gray-200" />
        <div className="p-5 space-y-3">
          <div className="h-6 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="flex items-center gap-2 pt-4">
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="h-4 bg-gray-200 rounded w-24" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
      <div className="flex gap-4">
        <div className="w-24 h-24 bg-gray-200 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-200 rounded-full" />
            <div className="h-3 bg-gray-200 rounded w-20" />
          </div>
        </div>
      </div>
    </div>
  );
});

function CommunityPageContent() {
  const searchParams = useSearchParams();
  const [mainCategory, setMainCategory] = useState<MainCategory>("market");
  const [selectedCategory, setSelectedCategory] = useState<PostCategory>("gold_trade");
  const [selectedType, setSelectedType] = useState<PostType | undefined>("buy_gold");
  const [currentSort, setCurrentSort] = useState<"latest" | "popular">("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // 지역 필터
  const [regions, setRegions] = useState<Array<{ region: string; districts: string[] }>>([]);
  const [selectedLocations, setSelectedLocations] = useState<Array<{ region: string; district?: string }>>([]);

  // 필터 모달 상태
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterStep, setFilterStep] = useState<"region" | "district">("region");
  const [tempSelectedRegion, setTempSelectedRegion] = useState<string>("");
  const [tempSelectedLocations, setTempSelectedLocations] = useState<Array<{ region: string; district?: string }>>([]);

  const { user } = useAuthStore();

  // 게시글 데이터
  const [data, setData] = useState<PostListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [inWebView, setInWebView] = useState(false);

  // Infinite scroll observer
  const observerTarget = useRef<HTMLDivElement>(null);

  // 웹뷰 환경 감지
  useEffect(() => {
    setInWebView(isWebView());
  }, []);

  // 지역 데이터 로드
  useEffect(() => {
    const fetchLocations = async () => {
      const result = await getStoreLocationsAction();
      if (result.success && result.data) {
        setRegions(result.data.regions);
      }
    };
    fetchLocations();
  }, []);

  // URL 쿼리 파라미터로 초기 state 설정
  useEffect(() => {
    const categoryParam = searchParams?.get("category") as PostCategory;
    const typeParam = searchParams?.get("type") as PostType;

    if (categoryParam && ["gold_trade", "gold_news", "qna"].includes(categoryParam)) {
      setSelectedCategory(categoryParam);
    }

    if (typeParam) {
      setSelectedType(typeParam);
    }
  }, [searchParams]);

  // selectedLocations를 문자열로 변환하여 메모이제이션 (깊은 비교 방지)
  const selectedLocationsKey = useMemo(() => {
    return JSON.stringify(selectedLocations);
  }, [selectedLocations]);

  // 게시글 데이터 로드 (디바운싱 적용)
  useEffect(() => {
    // 검색어가 있을 때만 500ms 디바운싱 적용
    const debounceTimer = setTimeout(() => {
      const fetchPosts = async () => {
        setIsLoading(true);
        setError(null);

        // 다중 지역을 regions[], districts[] 배열로 변환
        const regions = selectedLocations.map(loc => loc.region);
        const districts = selectedLocations.map(loc => loc.district || "");

        const result = await getPostsAction({
          category: selectedCategory,
          type: selectedType,
          page: 1,
          page_size: 12,
          sort_by: currentSort === "latest" ? "created_at" : "like_count",
          sort_order: "desc",
          regions: regions.length > 0 ? regions : undefined,
          districts: districts.length > 0 ? districts : undefined,
          search: searchQuery.trim() || undefined, // 검색어 추가
        });

        if (result.success && result.data) {
          setData(result.data);
          setCurrentPage(1);
          setHasMore(result.data.data.length < result.data.total);
        } else {
          setError(result.error || "게시글을 불러오는데 실패했습니다.");
        }

        setIsLoading(false);
      };

      fetchPosts();
    }, searchQuery.trim() ? 500 : 0); // 검색어가 있으면 500ms 대기, 없으면 즉시 실행

    return () => clearTimeout(debounceTimer);
  }, [selectedCategory, selectedType, currentSort, selectedLocationsKey, searchQuery]); // ✅ selectedLocations 대신 selectedLocationsKey 사용

  // 추가 데이터 로드 (무한스크롤)
  const loadMorePosts = useCallback(async () => {
    if (isLoadingMore || !hasMore || !data) return;

    setIsLoadingMore(true);

    // 다중 지역을 regions[], districts[] 배열로 변환
    const regions = selectedLocations.map(loc => loc.region);
    const districts = selectedLocations.map(loc => loc.district || "");

    const result = await getPostsAction({
      category: selectedCategory,
      type: selectedType,
      page: currentPage + 1,
      page_size: 12,
      sort_by: currentSort === "latest" ? "created_at" : "like_count",
      sort_order: "desc",
      regions: regions.length > 0 ? regions : undefined,
      districts: districts.length > 0 ? districts : undefined,
      search: searchQuery.trim() || undefined, // 검색어 추가
    });

    if (result.success && result.data) {
      setData((prevData) => {
        if (!prevData || !result.data) return prevData;
        return {
          ...result.data,
          data: [...prevData.data, ...result.data.data],
        };
      });
      setCurrentPage((prev) => prev + 1);
      const totalLoaded = (data?.data.length || 0) + result.data.data.length;
      setHasMore(totalLoaded < result.data.total);
    }

    setIsLoadingMore(false);
  }, [isLoadingMore, hasMore, data, selectedCategory, selectedType, currentPage, currentSort, selectedLocationsKey, searchQuery]); // ✅ selectedLocations 대신 selectedLocationsKey 사용

  // Intersection Observer 설정
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoadingMore, loadMorePosts]);

  const handleMainCategoryChange = useCallback((category: MainCategory) => {
    setMainCategory(category);
    if (category === "market") {
      setSelectedCategory("gold_trade");
      setSelectedType("buy_gold");
    } else {
      setSelectedCategory("gold_news");
      setSelectedType("product_news");
    }
    setCurrentPage(1);
  }, []);

  // Pull to Refresh 핸들러
  const handleRefresh = async () => {
    setCurrentPage(1);
    setData(null); // 데이터 초기화로 새로 로드 유도
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  // Pull to Refresh 훅
  const pullToRefreshState = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    disabled: isLoading,
  });

  // 뷰 모드 결정 (타입별 최적화)
  // 카드형: sell_gold, product_news
  // 리스트형: buy_gold, store_news, question
  const viewMode = (selectedType === "sell_gold" || selectedType === "product_news") ? "grid" : "list";

  // 선택된 필터 개수 (지역만)
  const activeFilterCount = selectedLocations.length;

  return (
    <>
      {/* Pull to Refresh 인디케이터 */}
      <PullToRefreshIndicator {...pullToRefreshState} />

      <div className="min-h-screen bg-white">
      {/* 회색 배경 - 메인 카테고리만 (Sticky) */}
      <div className="sticky top-[60px] z-40 bg-gray-50">
        <div className={`max-w-[1200px] mx-auto px-page ${inWebView ? "py-2" : "py-4"}`}>
          <div className={`flex items-center justify-between ${inWebView ? "gap-2" : "gap-3"}`}>
            <div className="flex gap-1">
              <button
                onClick={() => handleMainCategoryChange("market")}
                className={`font-bold rounded-lg transition-all ${
                  inWebView ? "px-3 py-1.5 text-xs" : "px-5 py-2 text-[15px]"
                } ${
                  mainCategory === "market"
                    ? "bg-[#C9A227] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                금시장
              </button>
              <button
                onClick={() => handleMainCategoryChange("community")}
                className={`font-bold rounded-lg transition-all ${
                  inWebView ? "px-3 py-1.5 text-xs" : "px-5 py-2 text-[15px]"
                } ${
                  mainCategory === "community"
                    ? "bg-[#C9A227] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                금소식
              </button>
            </div>

            {/* 글작성 버튼 */}
            {user && (
              <Link href="/community/write">
                <Button variant="brand-primary" size={inWebView ? "xs" : "sm"} className={inWebView ? "gap-1" : "gap-1.5"}>
                  <svg className={inWebView ? "w-3 h-3" : "w-4 h-4"} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span className={inWebView ? "text-xs" : ""}>글작성</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 흰색 배경 - 서브 카테고리 + 필터 (Sticky) */}
      <div className={`sticky z-30 bg-white ${inWebView ? "top-[92px]" : "top-[108px]"}`}>
        <div className={`max-w-[1200px] mx-auto px-page border-b border-gray-200 ${inWebView ? "py-2" : "py-3"}`}>
          <div className="flex items-center justify-between gap-3">
            {/* 서브 카테고리 */}
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {mainCategory === "market" ? (
                <>
                  <button
                    onClick={() => setSelectedType("buy_gold")}
                    className={`font-semibold rounded-lg transition-all whitespace-nowrap ${
                      inWebView ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-[14px]"
                    } ${
                      selectedType === "buy_gold" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    금 구매
                  </button>
                  <button
                    onClick={() => setSelectedType("sell_gold")}
                    className={`font-semibold rounded-lg transition-all whitespace-nowrap ${
                      inWebView ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-[14px]"
                    } ${
                      selectedType === "sell_gold" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    금 판매
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { setSelectedCategory("gold_news"); setSelectedType("product_news"); }}
                    className={`font-semibold rounded-lg transition-all whitespace-nowrap ${
                      inWebView ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-[14px]"
                    } ${
                      selectedType === "product_news" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    상품소식
                  </button>
                  <button
                    onClick={() => { setSelectedCategory("gold_news"); setSelectedType("store_news"); }}
                    className={`font-semibold rounded-lg transition-all whitespace-nowrap ${
                      inWebView ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-[14px]"
                    } ${
                      selectedType === "store_news" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    매장소식
                  </button>
                  <button
                    onClick={() => { setSelectedCategory("qna"); setSelectedType("question"); }}
                    className={`font-semibold rounded-lg transition-all whitespace-nowrap ${
                      inWebView ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-[14px]"
                    } ${
                      selectedCategory === "qna" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Q&A
                  </button>
                </>
              )}
            </div>

            {/* 액션 버튼들 */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isSearchOpen ? (
                <>
                  {/* 검색 버튼 */}
                  <button
                    onClick={() => setIsSearchOpen(true)}
                    className={`text-gray-600 hover:bg-gray-50 rounded-lg transition-colors ${
                      inWebView ? "p-1.5" : "p-2"
                    }`}
                    aria-label="검색"
                  >
                    <Search className={inWebView ? "w-4 h-4" : "w-5 h-5"} />
                  </button>

                  {/* 필터 버튼 (지역만) */}
                  <button
                    onClick={() => {
                      setTempSelectedLocations(selectedLocations);
                      setIsFilterOpen(true);
                    }}
                    className={`flex items-center text-gray-700 hover:bg-gray-50 rounded-lg transition-colors relative ${
                      inWebView ? "gap-1 px-2 py-1.5" : "gap-1.5 px-3 py-2"
                    }`}
                  >
                    <SlidersHorizontal className={inWebView ? "w-4 h-4" : "w-5 h-5"} />
                    <span className={`font-medium hidden sm:inline ${inWebView ? "text-xs" : "text-sm"}`}>지역</span>
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#C9A227] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>

                  {/* 정렬 */}
                  <div className="relative">
                    <select
                      value={currentSort}
                      onChange={(e) => setCurrentSort(e.target.value as "latest" | "popular")}
                      className="appearance-none pl-3 pr-8 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer bg-transparent border-0 focus:outline-none"
                    >
                      <option value="latest">최신순</option>
                      <option value="popular">인기순</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </>
              ) : (
                /* 검색 입력창 확장 */
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-5 duration-200">
                  <div className={`relative ${inWebView ? "flex-1 max-w-sm" : "w-64 sm:w-80"}`}>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="게시글 검색..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                      className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:bg-white transition-all"
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setIsSearchOpen(false);
                          setSearchQuery("");
                        }
                      }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      setIsSearchOpen(false);
                      setSearchQuery("");
                    }}
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    aria-label="검색 닫기"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 필터 Bottom Sheet - 다중 지역 선택 */}
      {isFilterOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setIsFilterOpen(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* 헤더 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                {filterStep === "district" && (
                  <button
                    onClick={() => {
                      setFilterStep("region");
                      setTempSelectedRegion("");
                    }}
                    className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                <h3 className="text-[20px] font-bold text-gray-900">
                  {filterStep === "region" ? "지역 선택" : `${tempSelectedRegion}`}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsFilterOpen(false);
                  setFilterStep("region");
                  setTempSelectedRegion("");
                  setTempSelectedLocations(selectedLocations);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 컨텐츠 */}
            <div className="flex-1 overflow-y-auto p-6">
              {filterStep === "region" ? (
                /* 1단계: 시/도 선택 */
                <div className="space-y-2">
                  {regions.map((region) => {
                    const isRegionSelected = tempSelectedLocations.some(
                      (loc) => loc.region === region.region && !loc.district
                    );
                    const hasDistrictSelected = tempSelectedLocations.some(
                      (loc) => loc.region === region.region && loc.district
                    );
                    const isPartiallySelected = hasDistrictSelected && !isRegionSelected;

                    return (
                      <div key={region.region} className="space-y-2">
                        <button
                          onClick={() => {
                            if (region.districts.length > 0) {
                              setTempSelectedRegion(region.region);
                              setFilterStep("district");
                            } else {
                              // 하위 지역이 없는 경우 바로 토글
                              const locationKey = { region: region.region };
                              const isSelected = tempSelectedLocations.some(
                                (loc) => loc.region === region.region && !loc.district
                              );
                              if (isSelected) {
                                setTempSelectedLocations(tempSelectedLocations.filter(
                                  (loc) => loc.region !== region.region
                                ));
                              } else {
                                setTempSelectedLocations([...tempSelectedLocations, locationKey]);
                              }
                            }
                          }}
                          className={`w-full px-5 py-4 rounded-xl transition-all font-medium flex items-center justify-between ${
                            isRegionSelected
                              ? "bg-[#C9A227] text-white shadow-md"
                              : isPartiallySelected
                              ? "bg-[#FEF9E7] border-2 border-[#C9A227] text-gray-900"
                              : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isRegionSelected
                                ? "bg-white border-white"
                                : isPartiallySelected
                                ? "bg-[#C9A227] border-[#C9A227]"
                                : "border-gray-300"
                            }`}>
                              {isRegionSelected && (
                                <svg className="w-3.5 h-3.5 text-[#C9A227]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                              {isPartiallySelected && (
                                <div className="w-2 h-2 bg-white rounded-sm"></div>
                              )}
                            </div>
                            <span>{region.region}</span>
                          </div>
                          {region.districts.length > 0 && (
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* 2단계: 구/군 선택 */
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      const locationKey = { region: tempSelectedRegion };
                      const isSelected = tempSelectedLocations.some(
                        (loc) => loc.region === tempSelectedRegion && !loc.district
                      );
                      if (isSelected) {
                        // 전체 선택 해제 - 해당 지역의 모든 선택 제거
                        setTempSelectedLocations(tempSelectedLocations.filter(
                          (loc) => loc.region !== tempSelectedRegion
                        ));
                      } else {
                        // 전체 선택 - 해당 지역의 구/군 선택 모두 제거하고 지역만 추가
                        setTempSelectedLocations([
                          ...tempSelectedLocations.filter((loc) => loc.region !== tempSelectedRegion),
                          locationKey
                        ]);
                      }
                    }}
                    className={`w-full text-left px-5 py-4 rounded-xl transition-all font-medium flex items-center gap-3 ${
                      tempSelectedLocations.some((loc) => loc.region === tempSelectedRegion && !loc.district)
                        ? "bg-[#C9A227] text-white shadow-md"
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      tempSelectedLocations.some((loc) => loc.region === tempSelectedRegion && !loc.district)
                        ? "bg-white border-white"
                        : "border-gray-300"
                    }`}>
                      {tempSelectedLocations.some((loc) => loc.region === tempSelectedRegion && !loc.district) && (
                        <svg className="w-3.5 h-3.5 text-[#C9A227]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    {tempSelectedRegion} 전체
                  </button>
                  {regions
                    .find((r) => r.region === tempSelectedRegion)
                    ?.districts.map((district) => {
                      const isDistrictSelected = tempSelectedLocations.some(
                        (loc) => loc.region === tempSelectedRegion && loc.district === district
                      );
                      const isRegionSelected = tempSelectedLocations.some(
                        (loc) => loc.region === tempSelectedRegion && !loc.district
                      );

                      return (
                        <button
                          key={district}
                          onClick={() => {
                            if (isRegionSelected) {
                              // 지역 전체가 선택된 경우, 해당 구/군만 제외
                              setTempSelectedLocations([
                                ...tempSelectedLocations.filter((loc) => !(loc.region === tempSelectedRegion && !loc.district)),
                                ...regions.find((r) => r.region === tempSelectedRegion)!.districts
                                  .filter((d) => d !== district)
                                  .map((d) => ({ region: tempSelectedRegion, district: d }))
                              ]);
                            } else {
                              // 구/군 개별 토글
                              const locationKey = { region: tempSelectedRegion, district };
                              if (isDistrictSelected) {
                                setTempSelectedLocations(tempSelectedLocations.filter(
                                  (loc) => !(loc.region === tempSelectedRegion && loc.district === district)
                                ));
                              } else {
                                setTempSelectedLocations([...tempSelectedLocations, locationKey]);
                              }
                            }
                          }}
                          className={`w-full text-left px-5 py-4 rounded-xl transition-all font-medium flex items-center gap-3 ${
                            isDistrictSelected || isRegionSelected
                              ? "bg-[#C9A227] text-white shadow-md"
                              : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isDistrictSelected || isRegionSelected
                              ? "bg-white border-white"
                              : "border-gray-300"
                          }`}>
                            {(isDistrictSelected || isRegionSelected) && (
                              <svg className="w-3.5 h-3.5 text-[#C9A227]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          {district}
                        </button>
                      );
                    })}
                </div>
              )}
            </div>

            {/* 하단 버튼 */}
            <div className="p-6 border-t border-gray-200 flex-shrink-0">
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setTempSelectedLocations([]);
                  }}
                >
                  초기화
                </Button>
                <Button
                  variant="brand-primary"
                  className="flex-1"
                  onClick={() => {
                    setSelectedLocations(tempSelectedLocations);
                    setIsFilterOpen(false);
                    setFilterStep("region");
                    setTempSelectedRegion("");
                  }}
                >
                  적용하기 {tempSelectedLocations.length > 0 && `(${tempSelectedLocations.length})`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Posts Grid */}
      <div className={`max-w-[1200px] mx-auto px-page ${inWebView ? "py-3" : "py-6"}`}>
        {/* 활성 필터 표시 (지역) */}
        {selectedLocations.length > 0 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {selectedLocations.map((location, index) => (
              <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FEF9E7] border border-[#C9A227]/30 text-[#8A6A00] text-sm font-medium rounded-full">
                <MapPin className="w-3.5 h-3.5" />
                {location.district ? `${location.region} ${location.district}` : location.region}
                <button
                  onClick={() => {
                    setSelectedLocations(selectedLocations.filter((_, i) => i !== index));
                  }}
                  className="hover:bg-[#C9A227]/20 rounded-full p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && (
          <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} viewMode={viewMode} />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-[18px] font-semibold text-gray-900 mb-2">오류가 발생했습니다</h3>
            <p className="text-caption text-gray-500">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && data && data.data.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h3 className="text-[18px] font-semibold text-gray-900 mb-2">아직 게시글이 없습니다</h3>
            <p className="text-caption text-gray-500 mb-6">첫 번째 게시글을 작성해보세요!</p>
            {user && (
              <Link href="/community/write">
                <Button variant="brand-primary">글쓰기</Button>
              </Link>
            )}
          </div>
        )}

        {/* Posts Grid or List */}
        {!isLoading && data && data.data.length > 0 && (
          <>
            {viewMode === "grid" ? (
              /* Grid View - 당근마켓 스타일 */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.data.map((post) => {
                  const userWithStore = { ...post.user, store: post.user.store || post.store };
                  return (
                  <Link
                    key={post.id}
                    href={`/community/posts/${post.id}/${post.slug}`}
                    className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 flex flex-col h-full"
                  >
                    {/* Thumbnail */}
                    <div className="relative overflow-hidden bg-gray-50 flex-shrink-0">
                      {post.image_urls && post.image_urls.length > 0 ? (
                        <div className="relative w-full aspect-[4/3]">
                          <Image
                            src={post.image_urls[0]}
                            alt={post.title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="w-full aspect-[4/3] bg-gradient-to-br from-[#C9A227] to-[#8A6A00] flex items-center justify-center">
                          <svg className="w-16 h-16 text-white/50" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                          </svg>
                        </div>
                      )}

                      {/* 상태 뱃지 */}
                      {post.type === "sell_gold" && post.reservation_status && (
                        <div className="absolute top-3 left-3">
                          {post.reservation_status === 'reserved' ? (
                            <span className="inline-flex items-center px-3 py-1.5 bg-[#C9A227] text-white text-xs font-bold rounded-full shadow-lg">
                              🔒 예약중
                            </span>
                          ) : post.reservation_status === 'completed' ? (
                            <span className="inline-flex items-center px-3 py-1.5 bg-gray-800 text-white text-xs font-bold rounded-full shadow-lg">
                              ✅ 거래완료
                            </span>
                          ) : null}
                        </div>
                      )}

                      {/* 가격 (금거래만) */}
                      {post.category === "gold_trade" && post.price != null && post.price > 0 && (
                        <div className="absolute bottom-3 right-3">
                          <span className="inline-flex items-center px-3 py-1.5 bg-black/70 backdrop-blur-sm text-white text-sm font-bold rounded-lg">
                            {post.price.toLocaleString()}원
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col flex-1">
                      {/* Profile + Stats */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center overflow-hidden relative ${
                            getUserImageUrl(userWithStore)
                              ? "bg-white border border-gray-200"
                              : post.user.role === "admin"
                              ? "bg-white border border-gray-200"
                              : "bg-gradient-to-br from-[#C9A227] to-[#8A6A00]"
                          }`}>
                            {getUserImageUrl(userWithStore) ? (
                              <Image
                                src={getUserImageUrl(userWithStore) || "/default-avatar.png"}
                                alt={getUserDisplayName(userWithStore)}
                                fill
                                sizes="24px"
                                className="object-cover"
                                loading="lazy"
                                unoptimized
                              />
                            ) : post.user.role === "admin" ? (
                              <StoreIcon className="w-3.5 h-3.5 text-[#C9A227]" />
                            ) : (
                              <span className="text-[10px] font-bold text-white">
                                {getUserDisplayName(userWithStore).charAt(0)}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-medium text-gray-600">
                            {getUserDisplayName(userWithStore)}
                          </span>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <Heart className="w-3.5 h-3.5 text-red-500" />
                            <span className="text-xs font-medium text-gray-700">{post.like_count}</span>
                          </div>
                          <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-xs font-medium text-gray-700">{post.comment_count}</span>
                          </div>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-[17px] font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-[#C9A227] transition-colors">
                        {post.title}
                      </h3>

                      {/* Location */}
                      {post.location && (
                        <div className="mb-3">
                          <div className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-md">
                            <MapPin className="w-3.5 h-3.5 text-[#C9A227]" />
                            <span className="font-medium">{post.location}</span>
                          </div>
                        </div>
                      )}

                      {/* Content Preview */}
                      <p className="text-caption text-gray-600 line-clamp-2 break-words leading-relaxed">
                        {post.content}
                      </p>
                    </div>
                  </Link>
                );
                })}
              </div>
            ) : (
              /* List View - 매장 프로필 + 콘텐츠 중심 */
              <div className="space-y-4">
                {data.data.map((post) => {
                  const userWithStore = { ...post.user, store: post.user.store || post.store };
                  return (
                  <Link
                    key={post.id}
                    href={`/community/posts/${post.id}/${post.slug}`}
                    className="block bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-200 p-5"
                  >
                    <div className="flex gap-3 sm:gap-5">
                      {/* Left: Store Profile + Thumbnails */}
                      <div className="flex flex-col gap-3 flex-shrink-0">
                        {/* Store/User Profile */}
                        <div className={`w-36 h-36 rounded-2xl flex items-center justify-center overflow-hidden relative ${
                          getUserImageUrl(userWithStore)
                            ? "bg-white border-2 border-gray-200"
                            : post.user.role === "admin"
                            ? "bg-white border-2 border-gray-200"
                            : "bg-gradient-to-br from-[#C9A227] to-[#8A6A00]"
                        }`}>
                          {getUserImageUrl(userWithStore) ? (
                            <Image
                              src={getUserImageUrl(userWithStore) || "/default-avatar.png"}
                              alt={getUserDisplayName(userWithStore)}
                              fill
                              sizes="144px"
                              className="object-cover"
                              loading="lazy"
                              unoptimized
                            />
                          ) : post.user.role === "admin" ? (
                            <StoreIcon className="w-16 h-16 text-[#C9A227]" />
                          ) : (
                            <span className="text-4xl font-bold text-white">
                              {getUserDisplayName(userWithStore).charAt(0)}
                            </span>
                          )}
                        </div>

                        {/* Image Thumbnails (if exists) */}
                        {post.image_urls && post.image_urls.length > 0 && (
                          <div className="flex gap-1.5 w-36">
                            {post.image_urls.slice(0, 3).map((url, idx) => (
                              <div key={idx} className="relative w-[42px] h-[42px] rounded-md overflow-hidden bg-gray-50">
                                <Image
                                  src={url}
                                  alt={`${post.title} ${idx + 1}`}
                                  fill
                                  sizes="42px"
                                  className="object-cover"
                                  loading="lazy"
                                  unoptimized
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Meta */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">
                              {getUserDisplayName(userWithStore)}
                            </span>
                            <span className="text-sm text-gray-400">·</span>
                            <span className="text-sm text-gray-400">
                              {new Date(post.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          {/* Stats */}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                              <Heart className="w-4 h-4 text-red-500" />
                              <span className="text-sm font-medium text-gray-700">{post.like_count}</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                              <MessageCircle className="w-4 h-4 text-blue-500" />
                              <span className="text-sm font-medium text-gray-700">{post.comment_count}</span>
                            </div>
                          </div>
                        </div>

                        {/* Location Badge */}
                        {post.location && (
                          <div className="mb-3">
                            <div className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-md">
                              <MapPin className="w-3.5 h-3.5 text-[#C9A227]" />
                              <span className="font-medium">{post.location}</span>
                            </div>
                          </div>
                        )}

                        {/* Title */}
                        <h3 className="text-[19px] font-bold text-gray-900 mb-2 line-clamp-1">
                          {post.title}
                        </h3>

                        {/* Content Preview */}
                        <p className="text-[15px] text-gray-600 line-clamp-2 leading-relaxed">
                          {post.content}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
                })}
              </div>
            )}

            {/* Infinite Scroll Observer Target */}
            {hasMore && (
              <div ref={observerTarget} className="text-center py-8">
                {isLoadingMore && (
                  <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-[#C9A227] rounded-full animate-spin"></div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </>
  );
}

export default function CommunityPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-[#C9A227] rounded-full animate-spin"></div>
        </div>
      }
    >
      <CommunityPageContent />
    </Suspense>
  );
}
