"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  MapPin,
  X,
  Store as StoreIcon,
  Star,
  Heart,
} from "lucide-react";
import { getStoresAction } from "@/actions/stores";
import type { StoreDetail } from "@/types/stores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type FilterTag = "all" | "open" | "24k" | "diamond" | "repair";

interface StoreWithExtras extends StoreDetail {
  distance?: string;
  tags?: string[];
  iconBg?: string;
  iconColor?: string;
  rating?: number;
  reviewCount?: number;
  isOpen?: boolean;
}

export default function StoresPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<FilterTag>("all");
  const [selectedStore, setSelectedStore] = useState<StoreWithExtras | null>(null);
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
          page_size: 50,
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
            return {
              ...store,
              distance: `${(Math.random() * 2 + 0.3).toFixed(1)}km`, // TODO: 실제 거리 계산
              tags: ["24K", "18K", "수리"].slice(0, Math.floor(Math.random() * 3) + 1),
              iconBg: colorSet.bg,
              iconColor: colorSet.color,
              rating: 4.5 + Math.random() * 0.5,
              reviewCount: Math.floor(Math.random() * 300) + 50,
              isOpen: Math.random() > 0.3,
            };
          });

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
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!store.name.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [stores, searchQuery]);

  const filterTags: Array<{ id: FilterTag; label: string }> = [
    { id: "all", label: "전체" },
    { id: "open", label: "영업중" },
    { id: "24k", label: "24K 취급" },
    { id: "diamond", label: "다이아몬드" },
    { id: "repair", label: "수리가능" },
  ];

  const handleStoreClick = (store: StoreWithExtras) => {
    setSelectedStore(store);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-[1200px] mx-auto px-5 py-8">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <h1 className="text-[32px] font-bold text-gray-900 mb-2">매장 찾기</h1>
          <p className="text-[16px] text-gray-600">내 주변의 금은방을 찾아보세요</p>
        </div>

        {/* 검색 영역 */}
        <div className="mb-6">
          <form onSubmit={handleSearch}>
            <div className="bg-gray-100 rounded-xl p-1.5 flex items-center mb-4">
              <div className="flex-1 flex items-center gap-3 px-3">
                <Search className="w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="매장명, 지역으로 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 py-2.5 text-[15px] bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
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
                className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-[14px] font-semibold rounded-lg"
              >
                검색
              </Button>
            </div>
          </form>

          {/* 필터 태그 */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {filterTags.map((tag) => (
              <Button
                key={tag.id}
                variant={selectedFilter === tag.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFilter(tag.id)}
                className={`px-4 py-2 text-[13px] font-medium rounded-full whitespace-nowrap ${
                  selectedFilter === tag.id
                    ? "bg-gray-900 text-white hover:bg-gray-800"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                }`}
              >
                {tag.label}
              </Button>
            ))}
          </div>
        </div>

        {/* 결과 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[14px] text-gray-500">검색결과</span>
            <span className="text-[14px] font-bold text-gray-900">
              {filteredStores.length}
            </span>
          </div>
        </div>

        {/* 로딩 상태 */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-gray-900" />
          </div>
        ) : error ? (
          /* 에러 상태 */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <StoreIcon className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-[16px] font-semibold text-gray-900 mb-2">오류가 발생했습니다</h3>
            <p className="text-[14px] text-gray-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="bg-gray-900 hover:bg-gray-800">
              다시 시도
            </Button>
          </div>
        ) : (
          /* 매장 리스트 */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStores.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                <StoreIcon className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-[16px] font-semibold text-gray-900 mb-2">
                  검색 결과가 없습니다
                </h3>
                <p className="text-[14px] text-gray-500">
                  다른 검색어를 입력하거나 필터를 변경해보세요
                </p>
              </div>
            ) : (
              filteredStores.map((store) => (
                <div
                  key={store.id}
                  onClick={() => handleStoreClick(store)}
                  className="bg-white p-5 rounded-2xl border border-gray-200 hover:shadow-lg transition-all duration-200 cursor-pointer"
                >
                  {/* 매장 이미지 */}
                  <div className="w-full h-48 rounded-xl overflow-hidden bg-gray-100 mb-4">
                    {store.image_url ? (
                      <img
                        src={store.image_url}
                        alt={store.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className={`w-full h-full ${store.iconBg} flex items-center justify-center`}
                      >
                        <StoreIcon className={`w-16 h-16 ${store.iconColor}`} strokeWidth={1.5} />
                      </div>
                    )}
                  </div>

                  {/* 매장 정보 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[18px] font-semibold text-gray-900">
                        {store.name}
                      </h3>
                      <Badge
                        className={`px-2 py-1 text-[11px] font-medium ${
                          store.isOpen
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {store.isOpen ? "영업중" : "준비중"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5 text-[13px] mb-2">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="text-yellow-500 font-semibold">
                        {store.rating?.toFixed(1) || "4.5"}
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-500">리뷰 {store.reviewCount || 0}</span>
                      <span className="text-gray-300">|</span>
                      <span className="text-blue-600 font-medium">{store.distance}</span>
                    </div>

                    <p className="text-[13px] text-gray-500 mb-3">{store.address || "주소 정보 없음"}</p>

                    {/* 태그 */}
                    {store.tags && store.tags.length > 0 && (
                      <div className="flex items-center gap-2 mb-4">
                        {store.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="px-2 py-1 bg-gray-100 text-gray-600 text-[11px] font-medium"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* 액션 버튼 */}
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
                        onClick={() => router.push(`/stores/${store.id}`)}
                      >
                        상세보기
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="border-gray-200 hover:bg-gray-50"
                      >
                        <Heart className="w-5 h-5 text-gray-400" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}
