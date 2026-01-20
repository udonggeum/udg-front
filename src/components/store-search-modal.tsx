"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Search, Store, MapPin, AlertCircle } from "lucide-react";
import { getStoresAction } from "@/actions/stores";
import type { StoreDetail } from "@/types/stores";
import { toast } from "sonner";
import { isWebView } from "@/lib/webview";

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
  const [inWebView, setInWebView] = useState(false);

  // 웹뷰 환경 감지
  useEffect(() => {
    setInWebView(isWebView());
  }, []);

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
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${inWebView ? 'p-2' : 'p-4'}`}>
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 모달 */}
      <div className={`relative w-full bg-white shadow-xl flex flex-col ${
        inWebView
          ? 'max-w-full rounded-xl max-h-[90vh]'  // 앱뷰: 화면에 꽉 차게, 높이 더 크게
          : 'max-w-2xl rounded-2xl max-h-[80vh]'  // 웹: 기존 크기
      }`}>
        {/* 헤더 */}
        <div className={`flex items-center justify-between border-b border-gray-100 ${
          inWebView ? 'p-3' : 'p-5'
        }`}>
          <h2 className={`font-bold text-gray-900 ${
            inWebView ? 'text-lg' : 'text-[20px]'
          }`}>매장 검색</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className={`text-gray-600 ${inWebView ? 'w-5 h-5' : 'w-5 h-5'}`} />
          </button>
        </div>

        {/* 검색바 */}
        <div className={`border-b border-gray-100 ${inWebView ? 'p-3' : 'p-5'}`}>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className={`flex-1 flex items-center bg-gray-100 rounded-lg ${
              inWebView ? 'gap-2 px-3 py-2' : 'gap-3 px-4 py-3'
            }`}>
              <Search className={`text-gray-400 flex-shrink-0 ${inWebView ? 'w-4 h-4' : 'w-5 h-5'}`} />
              <input
                type="text"
                placeholder={inWebView ? "매장명 검색" : "매장명, 지역, 주소로 검색하세요"}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`flex-1 bg-transparent text-gray-900 placeholder-gray-400 outline-none min-w-0 ${
                  inWebView ? 'text-sm' : 'text-body'
                }`}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className={`bg-[#C9A227] hover:bg-[#8A6A00] disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors flex-shrink-0 ${
                inWebView ? 'px-3 py-2 text-sm' : 'px-6 py-3'
              }`}
            >
              {isSearching ? (inWebView ? "..." : "검색중...") : "검색"}
            </button>
          </form>
          <p className={`text-gray-500 mt-3 ${inWebView ? 'text-xs' : 'text-small'}`}>
            💡 정확한 매장명이나 주소로 검색하면 더 빠르게 찾을 수 있습니다
          </p>
        </div>

        {/* 검색 결과 */}
        <div className={`flex-1 overflow-y-auto ${inWebView ? 'p-3' : 'p-5'}`}>
          {!hasSearched ? (
            <div className={`flex flex-col items-center justify-center text-center ${inWebView ? 'py-8' : 'py-12'}`}>
              <div className={`bg-gray-100 rounded-full flex items-center justify-center mb-4 ${
                inWebView ? 'w-12 h-12' : 'w-16 h-16'
              }`}>
                <Search className={`text-gray-400 ${inWebView ? 'w-6 h-6' : 'w-8 h-8'}`} />
              </div>
              <h3 className={`font-semibold text-gray-900 mb-2 ${
                inWebView ? 'text-sm' : 'text-[16px]'
              }`}>
                매장을 검색해보세요
              </h3>
              <p className={`text-gray-500 ${inWebView ? 'text-xs' : 'text-caption'}`}>
                내 매장을 찾아 소유권을 등록할 수 있습니다
              </p>
            </div>
          ) : isSearching ? (
            <div className={`flex flex-col items-center justify-center ${inWebView ? 'py-8' : 'py-12'}`}>
              <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mb-4"></div>
              <p className={`text-gray-500 ${inWebView ? 'text-xs' : 'text-caption'}`}>검색 중...</p>
            </div>
          ) : stores.length === 0 ? (
            <div className={`flex flex-col items-center justify-center text-center ${inWebView ? 'py-8' : 'py-12'}`}>
              <div className={`bg-gray-100 rounded-full flex items-center justify-center mb-4 ${
                inWebView ? 'w-12 h-12' : 'w-16 h-16'
              }`}>
                <AlertCircle className={`text-gray-400 ${inWebView ? 'w-6 h-6' : 'w-8 h-8'}`} />
              </div>
              <h3 className={`font-semibold text-gray-900 mb-2 ${
                inWebView ? 'text-sm' : 'text-[16px]'
              }`}>
                검색 결과가 없습니다
              </h3>
              <p className={`text-gray-500 mb-4 ${inWebView ? 'text-xs' : 'text-caption'}`}>
                다른 검색어로 시도해보세요
              </p>
            </div>
          ) : (
            <div className={inWebView ? 'space-y-2' : 'space-y-3'}>
              {stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => handleStoreClick(store)}
                  className={`w-full bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors text-left ${
                    inWebView ? 'p-3' : 'p-4'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`${store.is_managed ? 'bg-gray-100' : 'bg-[#FEF9E7]'} rounded-lg flex items-center justify-center flex-shrink-0 ${
                      inWebView ? 'w-10 h-10' : 'w-12 h-12'
                    }`}>
                      <Store className={`${store.is_managed ? 'text-gray-400' : 'text-[#C9A227]'} ${
                        inWebView ? 'w-5 h-5' : 'w-6 h-6'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-semibold text-gray-900 truncate ${
                          inWebView ? 'text-sm' : 'text-[16px]'
                        }`}>
                          {store.name}
                          {store.branch_name && (
                            <span className={`font-normal text-gray-600 ml-1 ${
                              inWebView ? 'text-xs' : 'text-caption'
                            }`}>
                              ({store.branch_name})
                            </span>
                          )}
                        </h3>
                        {store.is_managed ? (
                          <span className={`bg-gray-100 text-gray-600 font-medium rounded flex-shrink-0 ${
                            inWebView ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-[11px]'
                          }`}>
                            등록
                          </span>
                        ) : (
                          <span className={`bg-green-100 text-green-700 font-medium rounded flex-shrink-0 ${
                            inWebView ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-[11px]'
                          }`}>
                            미등록
                          </span>
                        )}
                      </div>
                      <div className={`flex items-center gap-1.5 text-gray-500 ${
                        inWebView ? 'text-xs' : 'text-small'
                      }`}>
                        <MapPin className={inWebView ? 'w-3 h-3' : 'w-4 h-4'} />
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
