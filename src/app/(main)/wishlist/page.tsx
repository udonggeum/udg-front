"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Search, ShoppingBag } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { getWishlistAction, removeFromWishlistAction } from "@/actions/wishlist";
import type { Product } from "@/types/products";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ProductCard from "@/components/product-card";
import { toast } from "sonner";

export default function WishlistPage() {
  const router = useRouter();
  const { isAuthenticated, tokens } = useAuthStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 위시리스트 로드
  const loadWishlist = async () => {
    if (!tokens?.access_token) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getWishlistAction(tokens.access_token);

      if (result.success && result.data) {
        // 상품 정보가 있는 아이템만 필터링
        const validProducts = result.data.wishlist_items
          .filter((item) => item.product)
          .map((item) => item.product!);
        setProducts(validProducts);
      } else {
        setError(result.error || "찜 목록을 불러올 수 없습니다.");
      }
    } catch (err) {
      setError("찜 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && tokens?.access_token) {
      loadWishlist();
    } else if (!isAuthenticated) {
      setIsLoading(false);
    }
  }, [isAuthenticated, tokens?.access_token]);

  /**
   * 위시리스트 토글 핸들러
   */
  const handleWishlistToggle = async (productId: number) => {
    if (!tokens?.access_token) {
      toast.error("로그인이 필요합니다.");
      router.push("/login");
      return;
    }

    try {
      const result = await removeFromWishlistAction(productId, tokens.access_token);

      if (result.success) {
        toast.success("찜 목록에서 제거되었습니다.");
        // 목록에서 해당 상품 제거
        setProducts((prev) => prev.filter((p) => p.id !== productId));
      } else {
        toast.error(result.error || "찜 목록 제거에 실패했습니다.");
      }
    } catch (err) {
      toast.error("찜 목록 제거 중 오류가 발생했습니다.");
    }
  };

  /**
   * 장바구니 추가 핸들러
   */
  const handleAddToCart = (productId: number) => {
    // TODO: 장바구니 기능 구현
    toast.info("장바구니 기능은 곧 제공될 예정입니다.");
    console.log("Add to cart:", productId);
  };

  return (
    <main className="flex-grow">
      <section className="container mx-auto px-4 py-10">
        {/* Page Header */}
        <div className="mb-8 pb-6 border-b-2 border-gray-200">
          <div className="space-y-2">
            <Badge className="text-sm bg-gray-900">Wishlist</Badge>
            <h1 className="text-4xl font-bold text-gray-900">찜한 상품</h1>
            <p className="text-base text-gray-600">
              마음에 드는 상품을 찜하고 나중에 확인하세요
            </p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-gray-900" />
          </div>
        ) : error ? (
          /* Error State */
          <div className="flex flex-col items-center justify-center py-20">
            <Alert variant="destructive" className="max-w-md">
              <AlertTitle>찜 목록을 불러올 수 없습니다</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={loadWishlist} variant="brand-primary" className="mt-6">
              다시 시도
            </Button>
          </div>
        ) : !isAuthenticated ? (
          /* Not Authenticated State */
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-300 bg-gray-50 py-24 text-center">
            <Heart size={80} className="text-gray-400 mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-3">로그인이 필요합니다</h2>
            <p className="text-base text-gray-600 mb-8 max-w-md">
              찜한 상품을 확인하려면 로그인해주세요.
            </p>
            <Link href="/login">
              <Button variant="brand-primary">로그인하기</Button>
            </Link>
          </div>
        ) : products.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-300 bg-gray-50 py-24 text-center animate-fade-in">
            <Heart size={80} className="text-gray-400 mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-3">찜한 상품이 없습니다</h2>
            <p className="text-base text-gray-600 mb-8 max-w-md">
              마음에 드는 상품을 찜하고 언제든지 다시 확인하세요.
              <br />
              하트 아이콘을 클릭하여 찜 목록에 추가할 수 있습니다.
            </p>
            <Link href="/products">
              <Button variant="brand-primary" className="gap-2">
                <Search size={20} />
                상품 둘러보기
              </Button>
            </Link>
          </div>
        ) : (
          /* Products Grid */
          <>
            {/* Product Count */}
            <div className="mb-6 rounded-2xl border-2 border-gray-200 bg-gradient-to-r from-gray-50 to-transparent p-5">
              <p className="text-base text-gray-900 flex items-center gap-2">
                <ShoppingBag size={20} />
                총 <span className="font-bold text-gray-900 text-xl">{products.length}</span>개의
                상품을 찜하셨습니다
              </p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onWishlistToggle={handleWishlistToggle}
                  onAddToCart={handleAddToCart}
                  isWishlisted={true}
                />
              ))}
            </div>

            {/* Continue Shopping */}
            <div className="mt-12 flex justify-center">
              <Link href="/products">
                <Button
                  variant="outline"
                  className="border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white"
                >
                  계속 쇼핑하기
                </Button>
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
