"use client";

import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getPostsAction } from "@/actions/community";
import { useAuthStore } from "@/stores/useAuthStore";
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
  }, [selectedCategory, selectedType, currentSort]);

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
  };

  const handleCategoryChange = (category: PostCategory) => {
    setSelectedCategory(category);
    setSelectedType(undefined);
    setCurrentPage(1);
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

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="pt-12 px-5 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div>
              <h1 className="text-[24px] sm:text-[32px] md:text-[40px] font-bold leading-tight tracking-[-0.02em] text-gray-900 mb-2">
                금광산
              </h1>
              <p className="text-[16px] text-gray-600">{getSubtitle()}</p>
            </div>
            {user && (
              <Link
                href="/community/write"
                className="px-6 py-3.5 bg-gray-900 hover:bg-gray-800 text-white text-[15px] font-semibold rounded-xl transition-colors duration-200 flex items-center gap-2 shadow-sm"
              >
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
              </Link>
            )}
          </div>

          {/* Main Category Toggle - 큰 토글 스위치 */}
          <div className="mb-6 inline-flex bg-white rounded-2xl p-2 border-2 border-gray-200 shadow-sm">
            <button
              onClick={() => handleMainCategoryChange("market")}
              className={`px-8 py-3 text-[18px] font-bold rounded-xl transition-all duration-200 ${
                mainCategory === "market"
                  ? "bg-yellow-400 text-gray-900 shadow-md"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              🏪 금시장
            </button>
            <button
              onClick={() => handleMainCategoryChange("community")}
              className={`px-8 py-3 text-[18px] font-bold rounded-xl transition-all duration-200 ${
                mainCategory === "community"
                  ? "bg-yellow-400 text-gray-900 shadow-md"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              💬 금소식
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 space-y-4">
            {/* Sort */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 font-medium mr-2">
                  정렬
                </span>
                <button
                  onClick={() => setCurrentSort("latest")}
                  className={`px-4 py-2 text-[14px] font-medium rounded-lg transition-colors duration-200 ${
                    currentSort === "latest"
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  최신순
                </button>
                <button
                  onClick={() => setCurrentSort("popular")}
                  className={`px-4 py-2 text-[14px] font-medium rounded-lg transition-colors duration-200 ${
                    currentSort === "popular"
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  인기순
                </button>
              </div>
            </div>

            {/* Type Filters - 금시장 */}
            {mainCategory === "market" && (
              <div className="flex items-start gap-2">
                <span className="text-sm text-gray-600 font-medium mr-2 pt-2">
                  유형
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedType(undefined)}
                    className={`px-4 py-2 text-[14px] font-medium rounded-lg transition-colors duration-200 ${
                      !selectedType
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    전체
                  </button>
                  <button
                    onClick={() => setSelectedType("sell_gold")}
                    className={`px-4 py-2 text-[14px] font-medium rounded-lg transition-colors duration-200 ${
                      selectedType === "sell_gold"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    금 판매
                  </button>
                  <button
                    onClick={() => setSelectedType("buy_gold")}
                    className={`px-4 py-2 text-[14px] font-medium rounded-lg transition-colors duration-200 ${
                      selectedType === "buy_gold"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    금 구매
                  </button>
                </div>
              </div>
            )}

            {/* Type Filters - 금소식 (커뮤니티) */}
            {mainCategory === "community" && (
              <div className="flex items-start gap-2">
                <span className="text-sm text-gray-600 font-medium mr-2 pt-2">
                  카테고리
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleCategoryChange("gold_news")}
                    className={`px-4 py-2 text-[14px] font-medium rounded-lg transition-colors duration-200 ${
                      selectedCategory === "gold_news"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    금소식
                  </button>
                  <button
                    onClick={() => handleCategoryChange("qna")}
                    className={`px-4 py-2 text-[14px] font-medium rounded-lg transition-colors duration-200 ${
                      selectedCategory === "qna"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Q&A
                  </button>
                </div>
              </div>
            )}

            {/* Sub Type Filters - 금소식 */}
            {selectedCategory === "gold_news" && (
              <div className="flex items-start gap-2">
                <span className="text-sm text-gray-600 font-medium mr-2 pt-2">
                  유형
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedType(undefined)}
                    className={`px-4 py-2 text-[14px] font-medium rounded-lg transition-colors duration-200 ${
                      !selectedType
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    전체
                  </button>
                  <button
                    onClick={() => setSelectedType("product_news")}
                    className={`px-4 py-2 text-[14px] font-medium rounded-lg transition-colors duration-200 ${
                      selectedType === "product_news"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    상품 소식
                  </button>
                  <button
                    onClick={() => setSelectedType("store_news")}
                    className={`px-4 py-2 text-[14px] font-medium rounded-lg transition-colors duration-200 ${
                      selectedType === "store_news"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    매장 소식
                  </button>
                  <button
                    onClick={() => setSelectedType("other")}
                    className={`px-4 py-2 text-[14px] font-medium rounded-lg transition-colors duration-200 ${
                      selectedType === "other"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    기타
                  </button>
                </div>
              </div>
            )}

            {/* Type Filters - QnA */}
            {selectedCategory === "qna" && (
              <div className="flex items-start gap-2">
                <span className="text-sm text-gray-600 font-medium mr-2 pt-2">
                  유형
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedType(undefined)}
                    className={`px-4 py-2 text-[14px] font-medium rounded-lg transition-colors duration-200 ${
                      !selectedType
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    전체
                  </button>
                  <button
                    onClick={() => setSelectedType("question")}
                    className={`px-4 py-2 text-[14px] font-medium rounded-lg transition-colors duration-200 ${
                      selectedType === "question"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    질문
                  </button>
                </div>
              </div>
            )}
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
                <h3 className="text-[15px] font-semibold text-gray-900">
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
                    <p className="text-[14px] text-gray-900 line-clamp-1">
                      {faq.title}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Posts Grid */}
      <section className="py-8 px-5 bg-white">
        <div className="max-w-[1200px] mx-auto">
          {/* Loading */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
              <p className="text-gray-600 text-[14px] mt-4">불러오는 중...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-center py-12">
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
              <p className="text-[14px] text-gray-500">
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
                        </div>
                      ) : (
                        <div className="w-full aspect-[16/9] bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center">
                          <svg
                            className="w-16 h-16 text-white/50"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                          </svg>
                        </div>
                      )}

                      {/* Content */}
                      <div className="p-5">
                        {/* Title */}
                        <h3 className="text-[18px] font-bold text-gray-900 mb-2 line-clamp-2">
                          {post.title}
                        </h3>

                        {/* Content Preview */}
                        <p className="text-[14px] text-gray-500 mb-4 line-clamp-3">
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
                      <p className="text-[15px] text-gray-500 mb-4 line-clamp-2">
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
        </div>
      </section>
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
