"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, ShoppingCart } from "lucide-react";
import type { Product } from "@/types/products";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  product: Product;
  onWishlistToggle?: (productId: number) => void;
  onAddToCart?: (productId: number) => void;
  isWishlisted?: boolean;
}

export default function ProductCard({
  product,
  onWishlistToggle,
  onAddToCart,
  isWishlisted = false,
}: ProductCardProps) {
  const [isLiked, setIsLiked] = useState(isWishlisted);

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLiked(!isLiked);
    onWishlistToggle?.(product.id);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    onAddToCart?.(product.id);
  };

  // 가격 포맷팅
  const formattedPrice = new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
  }).format(product.price);

  // 이미지 URL 처리
  const imageUrl = product.image_url || "/images/placeholder-product.png";

  return (
    <Link href={`/products/${product.id}`}>
      <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer h-full">
        <CardContent className="p-0">
          {/* 상품 이미지 */}
          <div className="relative aspect-square overflow-hidden rounded-t-lg bg-gray-100">
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />

            {/* 위시리스트 버튼 */}
            <button
              onClick={handleWishlistClick}
              className={`absolute top-3 right-3 p-2 rounded-full transition-all ${
                isLiked
                  ? "bg-red-500 text-white"
                  : "bg-white/90 text-gray-600 hover:bg-white"
              }`}
              aria-label="위시리스트"
            >
              <Heart
                size={20}
                fill={isLiked ? "currentColor" : "none"}
                className="transition-all"
              />
            </button>

            {/* 재고 부족 뱃지 */}
            {product.stock_quantity === 0 && (
              <Badge className="absolute bottom-3 left-3 bg-red-500">
                품절
              </Badge>
            )}
          </div>

          {/* 상품 정보 */}
          <div className="p-4">
            <div className="mb-2">
              <Badge variant="secondary" className="text-xs">
                {product.category}
              </Badge>
            </div>
            <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-gray-700">
              {product.name}
            </h3>
            {product.store && (
              <p className="text-sm text-gray-500 mb-2">{product.store.name}</p>
            )}
            <div className="flex items-baseline justify-between">
              <p className="text-xl font-bold text-gray-900">{formattedPrice}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Heart size={14} />
                  {product.wishlist_count}
                </span>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0">
          <Button
            onClick={handleAddToCart}
            className="w-full gap-2 bg-gray-900 hover:bg-gray-800"
            disabled={product.stock_quantity === 0}
          >
            <ShoppingCart size={16} />
            {product.stock_quantity === 0 ? "품절" : "장바구니"}
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
