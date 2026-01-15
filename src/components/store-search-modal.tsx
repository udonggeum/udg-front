"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Search, Store, MapPin, AlertCircle } from "lucide-react";
import { getStoresAction } from "@/actions/stores";
import type { StoreDetail } from "@/types/stores";
import { toast } from "sonner";

interface StoreSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StoreSearchModal({ isOpen, onClose }: StoreSearchModalProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [stores, setStores] = useState<StoreDetail[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // 검색 핸들러
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);

    try {
      const result = await getStoresAction({
        search: searchQuery.trim(),
        page: 1,
        page_size: 20,
      });

      if (result.success && result.data?.stores) {
        setStores(result.data.stores);
      } else {
        setStores([]);
        toast.error("매장 검색에 실패했습니다");
      }
    } catch (error) {
      console.error("Store search error:", error);
      setStores([]);
      toast.error("매장 검색 중 오류가 발생했습니다");
    } finally {
      setIsSearching(false);
    }
  };

  // 매장 클릭 핸들러
  const handleStoreClick = (store: StoreDetail) => {
    if (store.is_managed) {
      // 이미 등록된 매장
      toast.error("이미 등록된 매장입니다. 잘못된 정보라면 고객센터에 문의해주세요.", {
        duration: 4000,
      });
    } else {
      // 미등록 매장 - 소유권 등록 페이지로 이동
      onClose();
      router.push(`/stores/${store.id}/claim`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 모달 */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[80vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-[20px] font-bold text-gray-900">매장 검색</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* 검색바 */}
        <div className="p-5 border-b border-gray-100">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-gray-100 rounded-lg">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="매장명, 지역, 주소로 검색하세요"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-body text-gray-900 placeholder-gray-400 outline-none"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-6 py-3 bg-[#C9A227] hover:bg-[#8A6A00] disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors"
            >
              {isSearching ? "검색중..." : "검색"}
            </button>
          </form>
          <p className="text-small text-gray-500 mt-3">
            💡 정확한 매장명이나 주소로 검색하면 더 빠르게 찾을 수 있습니다
          </p>
        </div>

        {/* 검색 결과 */}
        <div className="flex-1 overflow-y-auto p-5">
          {!hasSearched ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-[16px] font-semibold text-gray-900 mb-2">
                매장을 검색해보세요
              </h3>
              <p className="text-caption text-gray-500">
                내 매장을 찾아 소유권을 등록할 수 있습니다
              </p>
            </div>
          ) : isSearching ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mb-4"></div>
              <p className="text-caption text-gray-500">검색 중...</p>
            </div>
          ) : stores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-[16px] font-semibold text-gray-900 mb-2">
                검색 결과가 없습니다
              </h3>
              <p className="text-caption text-gray-500 mb-4">
                다른 검색어로 시도해보세요
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => handleStoreClick(store)}
                  className="w-full p-4 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 ${store.is_managed ? 'bg-gray-100' : 'bg-[#FEF9E7]'} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Store className={`w-6 h-6 ${store.is_managed ? 'text-gray-400' : 'text-[#C9A227]'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[16px] font-semibold text-gray-900 truncate">
                          {store.name}
                          {store.branch_name && (
                            <span className="text-caption font-normal text-gray-600 ml-1">
                              ({store.branch_name})
                            </span>
                          )}
                        </h3>
                        {store.is_managed ? (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[11px] font-medium rounded flex-shrink-0">
                            등록
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-[11px] font-medium rounded flex-shrink-0">
                            미등록
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-small text-gray-500">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate">
                          {store.address || `${store.district || ""} ${store.dong || ""}`.trim() || "주소 없음"}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
