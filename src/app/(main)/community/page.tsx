"use client";

import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getPostsAction } from "@/actions/community";
import { getStoreLocationsAction } from "@/actions/stores";
import { useAuthStore } from "@/stores/useAuthStore";
import { Section, Container, PageHeader } from "@/components/layout-primitives";
import { Button } from "@/components/ui/button";
import type {
  PostCategory,
  PostType,
  PostListResponse,
} from "@/types/community";

type MainCategory = "market" | "community";

function CommunityPageContent() {
  const searchParams = useSearchParams();
  const [mainCategory, setMainCategory] = useState<MainCategory>("market");
  const [selectedCategory, setSelectedCategory] =
    useState<PostCategory>("gold_trade");
  const [selectedType, setSelectedType] = useState<PostType | undefined>(
    undefined
  );
  const [currentSort, setCurrentSort] = useState<"latest" | "popular">(
    "latest"
  );
  const [currentPage, setCurrentPage] = useState(1);

  // 지역 필터
  const [regions, setRegions] = useState<Array<{ region: string; districts: string[] }>>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");

  const { user } = useAuthStore();

  // 게시글 데이터
  const [data, setData] = useState<PostListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // FAQ 데이터
  const [faqData, setFaqData] = useState<PostListResponse | null>(null);

  // Infinite scroll observer
  const observerTarget = useRef<HTMLDivElement>(null);

  // 지역 데이터 로드 및 사용자 현재 위치 기본값 설정
  useEffect(() => {
    const fetchLocations = async () => {
      const result = await getStoreLocationsAction();
      if (result.success && result.data) {
        setRegions(result.data.regions);

        // 사용자의 현재 위치를 기본값으로 설정 (메인 카테고리가 금시장일 때만)
        if (user?.address && mainCategory === "market") {
          const addressParts = user.address.split(" ");
          if (addressParts.length >= 2) {
            const userRegion = addressParts[0];
            const userDistrict = addressParts[1];

            // 지역 데이터에 해당 지역이 있는지 확인
            const regionExists = result.data.regions.find(r => r.region === userRegion);
            if (regionExists) {
              setSelectedRegion(userRegion);
              if (regionExists.districts.includes(userDistrict)) {
                setSelectedDistrict(userDistrict);
              }
            }
          }
        }
      }
    };
    fetchLocations();
  }, [user?.address, mainCategory]);

  // URL 쿼리 파라미터로 초기 state 설정
  useEffect(() => {
    const categoryParam = searchParams?.get("category") as PostCategory;
    const typeParam = searchParams?.get("type") as PostType;

    if (
      categoryParam &&
      ["gold_trade", "gold_news", "qna"].includes(categoryParam)
    ) {
      setSelectedCategory(categoryParam);
    }

    if (typeParam) {
      setSelectedType(typeParam);
    }
  }, [searchParams]);

  // 게시글 데이터 로드
  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      setError(null);

      const result = await getPostsAction({
        category: selectedCategory,
        type: selectedType,
        page: 1,
        page_size: 9,
        sort_by: currentSort === "latest" ? "created_at" : "like_count",
        sort_order: "desc",
        region: selectedRegion || undefined,
        district: selectedDistrict || undefined,
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
  }, [selectedCategory, selectedType, currentSort, selectedRegion, selectedDistrict]);

  // 추가 데이터 로드 (무한스크롤)
  const loadMorePosts = useCallback(async () => {
    if (isLoadingMore || !hasMore || !data) return;

    setIsLoadingMore(true);

    const result = await getPostsAction({
      category: selectedCategory,
      type: selectedType,
      page: currentPage + 1,
      page_size: 9,
      sort_by: currentSort === "latest" ? "created_at" : "like_count",
      sort_order: "desc",
      region: selectedRegion || undefined,
      district: selectedDistrict || undefined,
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
  }, [
    isLoadingMore,
    hasMore,
    data,
    selectedCategory,
    selectedType,
    currentPage,
    currentSort,
    selectedRegion,
    selectedDistrict,
  ]);

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

  // FAQ 데이터 로드
  useEffect(() => {
    const fetchFAQ = async () => {
      if (selectedType === "faq") return;

      const result = await getPostsAction({
        category: selectedCategory,
        type: "faq",
        page: 1,
        page_size: 3,
        sort_by: "view_count",
        sort_order: "desc",
      });

      if (result.success && result.data) {
        setFaqData(result.data);
      }
    };

    fetchFAQ();
  }, [selectedCategory, selectedType]);

  const handleMainCategoryChange = (category: MainCategory) => {
    setMainCategory(category);
    if (category === "market") {
      setSelectedCategory("gold_trade");
    } else {
      setSelectedCategory("gold_news");
    }
    setSelectedType(undefined);
    setCurrentPage(1);
    setSelectedRegion("");
    setSelectedDistrict("");
  };

  const handleCategoryChange = (category: PostCategory) => {
    setSelectedCategory(category);
    setSelectedType(undefined);
    setCurrentPage(1);
    setSelectedRegion("");
    setSelectedDistrict("");
  };

  const getWriteButtonText = () => {
    if (mainCategory === "market") return "판매 글 쓰기";
    if (selectedCategory === "gold_news") return "글쓰기";
    return "Q&A 작성";
  };

  const getMainTitle = () => {
    return mainCategory === "market" ? "금시장" : "금소식";
  };

  const getSubtitle = () => {
    if (mainCategory === "market") {
      return "내가 가진 금을 올리면 주변 금은방에서 매입 문의를 보낼 수 있어요.";
    }
    return "금 시세, 매입 팁, 세공 후기 등 금 관련 이야기를 나눠보세요.";
  };

  // 뷰 모드 결정 (금시장=그리드, 금소식=리스트)
  const viewMode = mainCategory === "market" ? "grid" : "list";

  // 지역 선택 모달 상태
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <Section background="gradient" className="pt-8 pb-6">
        <Container>
          {/* 상단 우측 글쓰기 버튼 */}
          {user && (
            <div className="flex justify-end mb-4">
              <Link href="/community/write">
                <Button variant="brand-primary" size="lg">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                    />
                  </svg>
                  {getWriteButtonText()}
                </Button>
              </Link>
            </div>
          )}

          {/* Main Category Toggle */}
          <div className="mb-5 inline-flex bg-white rounded-2xl p-1.5 border-2 border-gray-200 shadow-sm">
            <button
              onClick={() => handleMainCategoryChange("market")}
              className={`px-8 py-3 text-[16px] font-bold rounded-xl transition-all duration-200 ${
                mainCategory === "market"
                  ? "bg-yellow-400 text-gray-900 shadow-md"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              금시장
            </button>
            <button
              onClick={() => handleMainCategoryChange("community")}
              className={`px-8 py-3 text-[16px] font-bold rounded-xl transition-all duration-200 ${
                mainCategory === "community"
                  ? "bg-yellow-400 text-gray-900 shadow-md"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              금소식
            </button>
          </div>

          {/* 지역 선택 영역 */}
          <div className="mb-5 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-4 border border-yellow-200">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsLocationModalOpen(true)}
                className="flex items-center gap-2 text-left flex-1"
              >
                <svg
                  className="w-5 h-5 text-yellow-600"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <div className="text-[17px] font-bold text-gray-900">
                    {selectedRegion && selectedDistrict
                      ? `${selectedRegion} ${selectedDistrict}`
                      : selectedRegion
                      ? selectedRegion
                      : "전체 지역"}
                  </div>
                  <div className="text-[13px] text-gray-600">
                    {mainCategory === "market"
                      ? "지역을 선택하여 주변 금은방 게시글을 확인하세요"
                      : "지역을 선택하여 해당 지역 매장의 소식을 확인하세요"}
                  </div>
                </div>
              </button>
              <button
                onClick={() => setIsLocationModalOpen(true)}
                className="px-4 py-2 text-[14px] font-semibold text-gray-700 bg-white rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                변경
              </button>
            </div>
          </div>

          {/* 지역 선택 모달 (간단 버전) */}
          {isLocationModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setIsLocationModalOpen(false)}>
              <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[18px] font-bold text-gray-900">지역 선택</h3>
                  <button
                    onClick={() => setIsLocationModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* 전체 지역 */}
                <button
                  onClick={() => {
                    setSelectedRegion("");
                    setSelectedDistrict("");
                    setIsLocationModalOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-colors ${
                    !selectedRegion ? "bg-yellow-50 text-gray-900 font-semibold" : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  전체 지역
                </button>

                {/* 지역 목록 */}
                {regions.map((region) => (
                  <div key={region.region} className="mb-3">
                    <button
                      onClick={() => {
                        setSelectedRegion(region.region);
                        setSelectedDistrict("");
                      }}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                        selectedRegion === region.region ? "bg-yellow-50 text-gray-900 font-semibold" : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      {region.region}
                    </button>

                    {/* 선택된 지역의 구/군 */}
                    {selectedRegion === region.region && region.districts.length > 0 && (
                      <div className="ml-4 mt-2 space-y-1">
                        <button
                          onClick={() => {
                            setSelectedDistrict("");
                            setIsLocationModalOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 rounded-lg text-[14px] transition-colors ${
                            !selectedDistrict ? "bg-gray-100 text-gray-900 font-medium" : "hover:bg-gray-50 text-gray-600"
                          }`}
                        >
                          전체 구/군
                        </button>
                        {region.districts.map((district) => (
                          <button
                            key={district}
                            onClick={() => {
                              setSelectedDistrict(district);
                              setIsLocationModalOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 rounded-lg text-[14px] transition-colors ${
                              selectedDistrict === district ? "bg-gray-100 text-gray-900 font-medium" : "hover:bg-gray-50 text-gray-600"
                            }`}
                          >
                            {district}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 타입 필터 + 정렬 */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* 타입 필터 */}
            <div className="flex items-center gap-2 flex-wrap">
              {mainCategory === "market" ? (
                <>
                  <button
                    onClick={() => setSelectedType(undefined)}
                    className={`px-4 py-2.5 text-caption font-semibold rounded-lg transition-all duration-200 ${
                      !selectedType
                        ? "bg-gray-900 text-white shadow-sm"
                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    전체
                  </button>
                  <button
                    onClick={() => setSelectedType("buy_gold")}
                    className={`px-4 py-2.5 text-caption font-semibold rounded-lg transition-all duration-200 ${
                      selectedType === "buy_gold"
                        ? "bg-gray-900 text-white shadow-sm"
                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    금 구매
                  </button>
                  <button
                    onClick={() => setSelectedType("sell_gold")}
                    className={`px-4 py-2.5 text-caption font-semibold rounded-lg transition-all duration-200 ${
                      selectedType === "sell_gold"
                        ? "bg-gray-900 text-white shadow-sm"
                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    금 판매
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setSelectedCategory("gold_news");
                      setSelectedType(undefined);
                    }}
                    className={`px-4 py-2.5 text-caption font-semibold rounded-lg transition-all duration-200 ${
                      selectedCategory === "gold_news" && !selectedType
                        ? "bg-gray-900 text-white shadow-sm"
                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    전체
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCategory("gold_news");
                      setSelectedType("product_news");
                    }}
                    className={`px-4 py-2.5 text-caption font-semibold rounded-lg transition-all duration-200 ${
                      selectedType === "product_news"
                        ? "bg-gray-900 text-white shadow-sm"
                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    상품소식
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCategory("gold_news");
                      setSelectedType("store_news");
                    }}
                    className={`px-4 py-2.5 text-caption font-semibold rounded-lg transition-all duration-200 ${
                      selectedType === "store_news"
                        ? "bg-gray-900 text-white shadow-sm"
                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    매장소식
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCategory("qna");
                      setSelectedType("question");
                    }}
                    className={`px-4 py-2.5 text-caption font-semibold rounded-lg transition-all duration-200 ${
                      selectedCategory === "qna"
                        ? "bg-gray-900 text-white shadow-sm"
                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Q&A
                  </button>
                </>
              )}
            </div>

            {/* 정렬 */}
            <div className="flex items-center gap-2">
              <select
                value={currentSort}
                onChange={(e) => setCurrentSort(e.target.value as "latest" | "popular")}
                className="px-4 py-2.5 text-caption font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200 cursor-pointer"
              >
                <option value="latest">최신순</option>
                <option value="popular">인기순</option>
              </select>
            </div>
          </div>

          {/* FAQ Section - 필터 아래에 표시 */}
          {faqData && faqData.data.length > 0 && selectedType !== "faq" && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mt-5">
              <div className="flex items-center gap-2 mb-3">
                <svg
                  className="w-4 h-4 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                  />
                </svg>
                <h3 className="text-body font-semibold text-gray-900">
                  자주 묻는 질문
                </h3>
              </div>
              <div className="space-y-1.5">
                {faqData.data.slice(0, 3).map((faq) => (
                  <Link
                    key={faq.id}
                    href={`/community/posts/${faq.id}`}
                    className="block bg-white rounded-lg p-3 hover:bg-gray-100 transition-colors border border-gray-200"
                  >
                    <p className="text-caption text-gray-900 line-clamp-1">
                      {faq.title}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </Container>
      </Section>

      {/* Posts Grid */}
      <Section className="py-8">
        <Container>
          {/* Loading */}
          {isLoading && (
            <div className="text-center py-page">
              <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
              <p className="text-gray-600 text-caption mt-4">불러오는 중...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-center py-page">
              <div className="text-red-500 mb-4">
                게시글을 불러오는데 실패했습니다.
              </div>
            </div>
          )}

          {/* Empty State */}
          {data && data.data.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
              </div>
              <h3 className="text-[18px] font-semibold text-gray-900 mb-2">
                아직 게시글이 없습니다
              </h3>
              <p className="text-caption text-gray-500">
                첫 번째 게시글을 작성해보세요!
              </p>
            </div>
          )}

          {/* Posts Grid or List */}
          {data && data.data.length > 0 && (
            <>
              {viewMode === "grid" ? (
                /* Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.data.map((post) => (
                    <Link
                      key={post.id}
                      href={`/community/posts/${post.id}`}
                      className="bg-white rounded-2xl overflow-hidden shadow-sm md:hover:shadow-md transition-shadow duration-200 border border-gray-100"
                    >
                      {/* Thumbnail */}
                      {post.image_urls && post.image_urls.length > 0 ? (
                        <div className="relative overflow-hidden bg-gray-100">
                          <img
                            src={post.image_urls[0]}
                            alt={post.title}
                            className="w-full aspect-[16/9] object-cover"
                          />
                          {/* 예약/완료 뱃지 (금 판매글만) */}
                          {post.type === "sell_gold" && post.reservation_status && (
                            <div className="absolute top-2 right-2">
                              {post.reservation_status === 'reserved' ? (
                                <span className="inline-flex items-center px-2.5 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full shadow-md">
                                  🔒 예약중
                                </span>
                              ) : post.reservation_status === 'completed' ? (
                                <span className="inline-flex items-center px-2.5 py-1 bg-gray-700 text-white text-xs font-bold rounded-full shadow-md">
                                  ✅ 거래완료
                                </span>
                              ) : null}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center">
                          <svg
                            className="w-16 h-16 text-white/50"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                          </svg>
                          {/* 예약/완료 뱃지 (이미지 없을 때, 금 판매글만) */}
                          {post.type === "sell_gold" && post.reservation_status && (
                            <div className="absolute top-2 right-2">
                              {post.reservation_status === 'reserved' ? (
                                <span className="inline-flex items-center px-2.5 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full shadow-md">
                                  🔒 예약중
                                </span>
                              ) : post.reservation_status === 'completed' ? (
                                <span className="inline-flex items-center px-2.5 py-1 bg-gray-700 text-white text-xs font-bold rounded-full shadow-md">
                                  ✅ 거래완료
                                </span>
                              ) : null}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Content */}
                      <div className="p-5">
                        {/* Title */}
                        <h3 className="text-[18px] font-bold text-gray-900 mb-2 line-clamp-2">
                          {post.title}
                        </h3>

                        {/* Content Preview */}
                        <p className="text-caption text-gray-500 mb-4 line-clamp-3">
                          {post.content}
                        </p>

                        {/* Meta Info */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-white">
                                {(() => {
                                  const authorName =
                                    post.user.role === "admin"
                                      ? post.store?.name || post.user.nickname
                                      : post.user.nickname;
                                  return authorName.charAt(0);
                                })()}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900">
                                {post.user.role === "admin"
                                  ? post.store?.name || post.user.nickname
                                  : post.user.nickname}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(post.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                                />
                              </svg>
                              {post.like_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                                />
                              </svg>
                              {post.comment_count}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                /* List View */
                <div className="space-y-3">
                  {data.data.map((post) => (
                    <Link
                      key={post.id}
                      href={`/community/posts/${post.id}`}
                      className="block bg-white rounded-xl shadow-sm md:hover:shadow-md transition-shadow duration-200 border border-gray-100 p-4"
                    >
                      {/* Title */}
                      <h3 className="text-[18px] font-bold text-gray-900 mb-2 line-clamp-1">
                        {post.title}
                      </h3>

                      {/* Content Preview */}
                      <p className="text-body text-gray-500 mb-4 line-clamp-2">
                        {post.content}
                      </p>

                      {/* Meta Info */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-white">
                              {(() => {
                                const authorName =
                                  post.user.role === "admin"
                                    ? post.store?.name || post.user.nickname
                                    : post.user.nickname;
                                return authorName.charAt(0);
                              })()}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {post.user.role === "admin"
                              ? post.store?.name || post.user.nickname
                              : post.user.nickname}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(post.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                              />
                            </svg>
                            {post.like_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                              />
                            </svg>
                            {post.comment_count}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Infinite Scroll Observer Target */}
              {hasMore && (
                <div ref={observerTarget} className="text-center py-8">
                  {isLoadingMore && (
                    <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
                  )}
                </div>
              )}
            </>
          )}
        </Container>
      </Section>
    </div>
  );
}

export default function CommunityPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
        </div>
      }
    >
      <CommunityPageContent />
    </Suspense>
  );
}
