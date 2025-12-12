"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  MapPin,
  Phone,
  Clock,
  ArrowLeft,
  Share2,
  Store as StoreIcon,
  MessageSquare,
} from "lucide-react";
import { getStoreDetailAction } from "@/actions/stores";
import { getStoreProductsAction } from "@/actions/products";
import type { StoreDetail } from "@/types/stores";
import type { Product } from "@/types/products";
import ProductCard from "@/components/product-card";

type TabType = "products" | "info";

export default function StoreDetailPage() {
  const router = useRouter();
  const params = useParams();
  const storeId = params.storeId ? Number(params.storeId) : null;

  const [store, setStore] = useState<StoreDetail | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingStore, setIsLoadingStore] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("products");
  const [imageError, setImageError] = useState(false);

  // 매장 정보 로드
  useEffect(() => {
    if (!storeId || storeId <= 0) {
      setStoreError("잘못된 매장 ID입니다.");
      setIsLoadingStore(false);
      return;
    }

    const loadStore = async () => {
      setIsLoadingStore(true);
      setStoreError(null);

      try {
        const result = await getStoreDetailAction(storeId, false);

        if (result.success && result.data) {
          setStore(result.data.store);
        } else {
          setStoreError(result.error || "매장 정보를 불러올 수 없습니다.");
        }
      } catch (err) {
        setStoreError("매장 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setIsLoadingStore(false);
      }
    };

    loadStore();
  }, [storeId]);

  // 상품 목록 로드
  useEffect(() => {
    if (!store) return;

    const loadProducts = async () => {
      setIsLoadingProducts(true);
      setProductsError(null);

      try {
        const result = await getStoreProductsAction(store.id, {
          page: 1,
          page_size: 50,
        });

        if (result.success && result.data) {
          setProducts(result.data.products);
        } else {
          // 404 에러는 상품이 없는 것으로 처리 (에러 메시지 표시하지 않음)
          console.log("상품 조회 실패:", result.error);
          setProducts([]);
        }
      } catch (err) {
        console.error("상품 조회 에러:", err);
        setProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    loadProducts();
  }, [store]);

  // 로딩 상태
  if (isLoadingStore) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-[14px] text-gray-500">매장 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (storeError || !store) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <StoreIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-[20px] font-bold text-gray-900 mb-2">
            매장을 불러올 수 없습니다
          </h2>
          <p className="text-[14px] text-gray-500 mb-6">{storeError}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white text-[14px] font-semibold rounded-lg transition-colors"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 영업 상태 계산
  const getStoreStatus = () => {
    if (!store.open_time || !store.close_time) {
      return { label: "시간 정보 없음", className: "bg-gray-100 text-gray-600" };
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [openHour, openMin] = store.open_time.split(':').map(Number);
    const [closeHour, closeMin] = store.close_time.split(':').map(Number);

    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;

    if (currentTime >= openTime && currentTime < closeTime) {
      return { label: "영업중", className: "bg-green-100 text-green-700" };
    }
    return { label: "영업종료", className: "bg-red-100 text-red-700" };
  };

  const status = getStoreStatus();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 커버 이미지 */}
      <div className="relative h-[280px] w-full overflow-hidden bg-gradient-to-br from-gray-50 via-gray-100 to-yellow-100">
        <div className="absolute inset-0 opacity-20">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="5" cy="5" r="1" fill="#2e2b29ff" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>

        {/* 뒤로가기 버튼 */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-10 flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-lg transition-colors shadow-sm"
        >
          <ArrowLeft className="w-5 h-5 text-gray-900" />
          <span className="text-[14px] font-semibold text-gray-900">뒤로가기</span>
        </button>
      </div>

      {/* 매장 메인 정보 */}
      <div className="relative z-10 -mt-20 max-w-[1080px] mx-auto px-5 w-full">
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-5">
          <div className="flex flex-col md:flex-row gap-4">
            {/* 매장 이미지 */}
            <div className="w-32 h-32 bg-gray-100 border border-gray-200 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden">
              {store.image_url && !imageError ? (
                <img
                  src={store.image_url}
                  alt={store.name}
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <StoreIcon className="w-16 h-16 text-gray-300" />
              )}
            </div>

            {/* 매장 정보 */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h1 className="text-[28px] font-bold text-gray-900 mb-2">{store.name}</h1>
                  {store.description && (
                    <p className="text-[15px] text-gray-600 mb-3">{store.description}</p>
                  )}
                </div>
              </div>

              {/* 매장 태그 */}
              {store.category_counts && Object.keys(store.category_counts).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.entries(store.category_counts).map(([category, count]) => (
                    <span
                      key={category}
                      className="px-3 py-1.5 bg-yellow-50 text-yellow-800 text-[13px] font-medium rounded-full border border-yellow-200"
                    >
                      {category} {count}개
                    </span>
                  ))}
                </div>
              )}

              {/* 빠른 액션 버튼 */}
              <div className="flex gap-3">
                {store.phone && (
                  <a
                    href={`tel:${store.phone.replace(/[^0-9]/g, '')}`}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-900 hover:bg-gray-800 text-white text-[15px] font-semibold rounded-xl transition-colors"
                  >
                    <MessageSquare className="w-5 h-5" />
                    전화하기
                  </a>
                )}
                {store.address && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border-2 border-gray-200 hover:border-gray-900 text-gray-900 text-[15px] font-semibold rounded-xl transition-colors"
                  >
                    <MapPin className="w-5 h-5" />
                    길찾기
                  </a>
                )}
                <button className="flex items-center justify-center gap-2 px-5 py-3 bg-white border-2 border-gray-200 hover:border-gray-900 text-gray-900 text-[15px] font-semibold rounded-xl transition-colors">
                  <Share2 className="w-5 h-5" />
                  공유
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-[1080px] mx-auto px-5 py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 좌측: 메인 컨텐츠 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* 탭 네비게이션 */}
              <nav className="border-b border-gray-100 px-6 flex items-center gap-8 overflow-x-auto">
                <button
                  onClick={() => setActiveTab("products")}
                  className={`relative py-4 text-[15px] font-medium whitespace-nowrap transition-colors ${
                    activeTab === "products"
                      ? "text-gray-900 font-semibold after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:bg-gray-900"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  상품 목록 {products.length > 0 && `(${products.length})`}
                </button>
                <button
                  onClick={() => setActiveTab("info")}
                  className={`relative py-4 text-[15px] font-medium whitespace-nowrap transition-colors ${
                    activeTab === "info"
                      ? "text-gray-900 font-semibold after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:bg-gray-900"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  매장 정보
                </button>
              </nav>

              {/* 탭 콘텐츠 */}
              <div className="p-6">
                {activeTab === "products" && (
                  <div>
                    {isLoadingProducts ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                      </div>
                    ) : productsError ? (
                      <div className="p-12 text-center">
                        <p className="text-gray-500 mb-2">상품을 불러올 수 없습니다</p>
                        <p className="text-[13px] text-gray-400">{productsError}</p>
                      </div>
                    ) : products.length === 0 ? (
                      <div className="p-12 text-center">
                        <StoreIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-2">등록된 상품이 없습니다</p>
                        <p className="text-[13px] text-gray-400">
                          매장에서 상품을 등록하면 이곳에 표시됩니다
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {products.map((product) => (
                          <ProductCard key={product.id} product={product} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "info" && (
                  <div className="space-y-4">
                    <div className="prose prose-sm max-w-none">
                      {store.description ? (
                        <p className="text-[15px] text-gray-700 leading-relaxed">
                          {store.description}
                        </p>
                      ) : (
                        <p className="text-[15px] text-gray-400 italic">
                          매장 소개가 등록되지 않았습니다
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 우측: 사이드바 */}
          <div className="lg:col-span-1">
            <div className="sticky top-[180px] space-y-4">
              {/* 매장 정보 카드 */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[16px] font-bold text-gray-900">매장 정보</h3>
                  <span className={`px-2.5 py-1 text-[12px] font-semibold rounded-full ${status.className}`}>
                    {status.label}
                  </span>
                </div>
                <div className="space-y-3 text-[14px]">
                  {store.address && (
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="flex gap-3">
                        <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div className="text-gray-600">{store.address}</div>
                      </div>
                    </div>
                  )}
                  {store.phone && (
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="flex gap-3">
                        <Phone className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <a href={`tel:${store.phone}`} className="text-blue-600 hover:underline">
                          {store.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  {(store.open_time || store.close_time) && (
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="flex gap-3 items-center">
                        <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div className="text-[14px] text-gray-900 font-medium">
                          {(store.open_time || "--:--") + " - " + (store.close_time || "--:--")}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 지도 미리보기 */}
              {store.address && (
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                  <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13px] text-blue-600 hover:underline"
                      >
                        지도 보기
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
