"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { MapPin, Phone, Clock, PackageSearch, ArrowLeft, ExternalLink } from "lucide-react";
import { getStoreDetailAction } from "@/actions/stores";
import { getStoreProductsAction } from "@/actions/products";
import type { StoreDetail } from "@/types/stores";
import type { Product } from "@/types/products";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ProductCard from "@/components/product-card";

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
    if (!storeId || storeId <= 0) return;

    const loadProducts = async () => {
      setIsLoadingProducts(true);
      setProductsError(null);

      try {
        const result = await getStoreProductsAction(storeId, {
          include_options: true,
          page_size: 24,
        });

        if (result.success && result.data) {
          setProducts(result.data.products);
        } else {
          setProductsError(result.error || "상품 목록을 불러올 수 없습니다.");
        }
      } catch (err) {
        setProductsError("상품 목록을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setIsLoadingProducts(false);
      }
    };

    loadProducts();
  }, [storeId]);

  // 지역 텍스트
  const locationText = store?.region && store?.district
    ? `${store.region} ${store.district}`
    : store?.region || store?.district || "";

  // 전화번호 정제
  const sanitizedPhone = store?.phone?.replace(/[^0-9+]/g, "") || "";

  // 지도 URL
  const mapSearchQuery = store?.address?.trim() || `${locationText} ${store?.name}`.trim();
  const mapUrl = mapSearchQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapSearchQuery)}`
    : undefined;

  // 잘못된 ID
  if (!storeId || storeId <= 0) {
    return (
      <main className="flex-grow">
        <section className="container mx-auto px-4 py-16">
          <Alert variant="destructive">
            <AlertTitle>잘못된 접근입니다</AlertTitle>
            <AlertDescription>
              유효하지 않은 매장 ID입니다. 매장 목록에서 다시 선택해주세요.
            </AlertDescription>
          </Alert>
          <div className="mt-6 flex justify-center">
            <Button onClick={() => router.push("/stores")} className="bg-gray-900 hover:bg-gray-800">
              매장 목록으로
            </Button>
          </div>
        </section>
      </main>
    );
  }

  // 로딩 중
  if (isLoadingStore) {
    return (
      <main className="flex-grow">
        <section className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-gray-900 mx-auto mb-4" />
            <p className="text-gray-600">매장 정보를 불러오는 중입니다...</p>
          </div>
        </section>
      </main>
    );
  }

  // 에러 발생
  if (storeError) {
    return (
      <main className="flex-grow">
        <section className="container mx-auto px-4 py-16">
          <Alert variant="destructive">
            <AlertTitle>매장을 불러오지 못했습니다</AlertTitle>
            <AlertDescription>{storeError}</AlertDescription>
          </Alert>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => window.location.reload()} className="bg-gray-900 hover:bg-gray-800">
              다시 시도
            </Button>
            <Button onClick={() => router.push("/stores")} variant="outline">
              매장 목록으로
            </Button>
          </div>
        </section>
      </main>
    );
  }

  // 데이터 없음
  if (!store) {
    return (
      <main className="flex-grow">
        <section className="container mx-auto px-4 py-16">
          <div className="rounded-xl bg-gray-50 py-16 text-center text-gray-600">
            매장 정보를 찾을 수 없습니다. 다른 매장을 선택해주세요.
          </div>
          <div className="mt-6 flex justify-center">
            <Button onClick={() => router.push("/stores")} className="bg-gray-900 hover:bg-gray-800">
              매장 목록으로
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex-grow">
      {/* 매장 정보 섹션 */}
      <section className="bg-gray-50 py-10">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* 뒤로가기 & 지역 정보 */}
          <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-gray-600">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              이전으로
            </Button>
            <span className="hidden sm:block">|</span>
            <span>
              {store.region || "지역 정보 없음"} · {store.district || "세부 지역 정보 없음"}
            </span>
          </div>

          {/* 메인 정보 */}
          <div className="grid gap-10 lg:grid-cols-[2fr_3fr]">
            {/* 매장 이미지 */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-xl border border-gray-200">
              {store.image_url ? (
                <img
                  src={store.image_url}
                  alt={`${store.name} 매장 이미지`}
                  className="h-full w-full object-cover min-h-[400px]"
                />
              ) : (
                <div className="h-full w-full bg-gray-100 flex items-center justify-center min-h-[400px]">
                  <PackageSearch className="w-24 h-24 text-gray-300" />
                </div>
              )}
            </div>

            {/* 매장 정보 */}
            <div className="flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <Badge variant="outline" className="border-gray-900 text-gray-900">
                  매장 정보
                </Badge>
                <h1 className="text-4xl font-bold leading-tight text-gray-900">
                  {store.name}
                </h1>
                {store.description && (
                  <p className="text-lg text-gray-700 leading-relaxed">
                    {store.description}
                  </p>
                )}
                <p className="flex items-start gap-2 text-base text-gray-600">
                  <MapPin className="mt-1 h-5 w-5 text-gray-900" />
                  <span>
                    {[locationText, store.address].filter(Boolean).join(" ")}
                  </span>
                </p>
              </div>

              {/* 정보 카드 */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="border-gray-200">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-gray-100 p-2 text-gray-900">
                        <PackageSearch className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600">등록 상품</p>
                        <p className="text-xl font-semibold text-gray-900">
                          {store.product_count?.toLocaleString() || "0"}개
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-gray-200">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-gray-100 p-2 text-gray-900">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600">영업시간</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {store.business_hours ||
                           (store.open_time && store.close_time
                             ? `${store.open_time} - ${store.close_time}`
                             : "정보 준비 중")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-gray-200">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-gray-100 p-2 text-gray-900">
                        <Phone className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600">연락처</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {store.phone || "정보 준비 중"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-gray-200">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-gray-100 p-2 text-gray-900">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600">지역</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {locationText || "정보 준비 중"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 액션 버튼 */}
              <div className="flex flex-wrap gap-3">
                {sanitizedPhone && (
                  <a
                    href={`tel:${sanitizedPhone}`}
                    className="md:hidden"
                  >
                    <Button className="bg-gray-900 hover:bg-gray-800 gap-2">
                      <Phone className="h-5 w-5" />
                      전화 연결
                    </Button>
                  </a>
                )}

                {mapUrl && (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" className="gap-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white">
                      <ExternalLink className="h-5 w-5" />
                      지도에서 보기
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 매장 상품 섹션 */}
      <section className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">매장 상품</h2>
            <p className="text-sm text-gray-600">
              총 {products.length.toLocaleString()}개의 상품이 등록되어 있습니다.
            </p>
          </div>
          {isLoadingProducts && (
            <span className="text-sm text-gray-600">데이터 새로고침 중...</span>
          )}
        </div>

        {productsError ? (
          <Alert variant="destructive">
            <AlertTitle>상품을 불러오지 못했습니다</AlertTitle>
            <AlertDescription>{productsError}</AlertDescription>
          </Alert>
        ) : isLoadingProducts ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 h-64 rounded-lg mb-4" />
                <div className="bg-gray-200 h-4 rounded mb-2" />
                <div className="bg-gray-200 h-4 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-xl bg-gray-50 py-16 text-center text-gray-600">
            아직 등록된 상품이 없습니다. 곧 업데이트될 예정입니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onWishlistToggle={(id) => console.log("Wishlist toggle:", id)}
                onAddToCart={(id) => console.log("Add to cart:", id)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
