"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { getLatestGoldPricesAction } from "@/actions/goldPrices";
import GoldPriceChart from "@/components/gold-price-chart";
import PriceTableHistory from "@/components/price-table-history";
import PriceCalculator from "@/components/price-calculator";
import { Container } from "@/components/layout-primitives";
import { Button } from "@/components/ui/button";
import type { GoldPrice, GoldType, HistoryPeriod } from "@/types/goldPrices";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";

interface GoldPriceWithCalculations extends GoldPrice {
  price_per_don: number;
  purity: string;
  badge_bg: string;
  badge_text: string;
  sortOrder: number;
}

export default function PricesPage() {
  const router = useRouter();
  const [pricesData, setPricesData] = useState<GoldPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<GoldType>("24K");
  const [selectedPeriod, setSelectedPeriod] = useState<HistoryPeriod>("1개월");
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");

  const loadPrices = async () => {
    setIsLoading(true);
    const result = await getLatestGoldPricesAction();
    if (result.success && result.data) {
      setPricesData(result.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadPrices();
  }, []);

  // Pull to Refresh 핸들러
  const handleRefresh = async () => {
    await loadPrices();
    await new Promise(resolve => setTimeout(resolve, 300));
  };

  // Pull to Refresh 훅
  const pullToRefreshState = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    disabled: isLoading,
  });

  // 금 시세 데이터에 UI용 계산 필드 추가
  const prices: GoldPriceWithCalculations[] = useMemo(() => {
    if (!pricesData) return [];

    // Helper function to get purity percentage
    const getPurity = (type: string): string => {
      switch (type) {
        case "24K":
          return "99.99%";
        case "18K":
          return "75%";
        case "14K":
          return "58.5%";
        case "Platinum":
          return "99.95%";
        case "Silver":
          return "99.9%";
        default:
          return "";
      }
    };

    // Helper function to get badge colors
    const getBadgeColors = (type: string): { bg: string; text: string } => {
      if (type === "Platinum") {
        return { bg: "bg-gray-100", text: "text-gray-600" };
      }
      if (type === "Silver") {
        return { bg: "bg-slate-100", text: "text-slate-600" };
      }
      return { bg: "bg-[#FEF9E7]", text: "text-[#8A6A00]" };
    };

    // 정렬 순서 정의: 24K > 18K > 14K > Platinum > Silver
    const typeOrder: Record<string, number> = {
      "24K": 1,
      "18K": 2,
      "14K": 3,
      Platinum: 4,
      Silver: 5,
    };

    return pricesData
      .map((price: GoldPrice) => {
        const colors = getBadgeColors(price.type);
        return {
          ...price,
          sell_price: Math.round(price.sell_price),
          buy_price: Math.round(price.buy_price),
          // 1돈 = 3.75g
          price_per_don: Math.round(price.sell_price * 3.75),
          purity: getPurity(price.type),
          badge_bg: colors.bg,
          badge_text: colors.text,
          change_percent: price.change_percent ?? 0,
          change_amount: price.change_amount ?? 0,
          sortOrder: typeOrder[price.type] || 99,
        };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [pricesData]);

  // 선택된 금 유형의 가격 (차트용)
  const selectedPrice = prices.find((p) => p.type === selectedType);

  // 현재 시각
  const currentTime = new Date().toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      {/* Pull to Refresh 인디케이터 */}
      <PullToRefreshIndicator {...pullToRefreshState} />

      <main className="py-8">
        <Container>
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-[28px] font-bold text-gray-900">실시간 금시세</h1>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-[12px] font-semibold text-green-700">LIVE</span>
          </div>
        </div>
        <p className="text-body text-gray-500">{currentTime} 기준</p>
      </div>

      {/* 메인 시세 카드 - 개선된 UI */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
          {prices.map((price) => {
            const isPositive = (price.change_percent || 0) > 0;
            const isZero = (price.change_percent || 0) === 0;
            const isSelected = selectedType === price.type;

            return (
              <div
                key={price.type}
                onClick={() => setSelectedType(price.type)}
                className={`relative bg-white p-5 rounded-xl cursor-pointer transition-shadow duration-200 ${
                  isSelected
                    ? "ring-2 ring-[#C9A227] shadow-lg"
                    : "shadow-sm md:hover:shadow-md"
                }`}
              >
                {/* 선택 표시 */}
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <div className="w-5 h-5 bg-[#C9A227] rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                )}

                {/* 금속 이름 + 배지 */}
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className={`w-8 h-8 ${price.badge_bg} rounded-lg flex items-center justify-center`}
                  >
                    <span className={`text-[11px] font-bold ${price.badge_text}`}>
                      {price.type}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-caption font-bold text-gray-900">
                      {price.type === "24K"
                        ? "순금"
                        : price.type === "18K"
                        ? "18K"
                        : price.type === "14K"
                        ? "14K"
                        : price.type === "Platinum"
                        ? "백금"
                        : "은"}
                    </h3>
                    <p className="text-[10px] text-gray-400">{price.purity}</p>
                  </div>
                </div>

                {/* 가격 - 더 크고 명확하게 */}
                <div className="mb-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[24px] font-bold text-gray-900 tabular-nums leading-none">
                      {price.sell_price.toLocaleString()}
                    </span>
                    <span className="text-[12px] text-gray-500">원</span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">그램당 매도가</div>
                </div>

                {/* 변동률 - 더 눈에 띄게 */}
                <div className="space-y-1.5">
                  {!isZero && (
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${
                        isPositive ? "bg-red-50" : "bg-blue-50"
                      }`}
                    >
                      {isPositive ? (
                        <ChevronUp
                          className={`w-3.5 h-3.5 ${isPositive ? "text-red-500" : "text-blue-500"}`}
                        />
                      ) : (
                        <ChevronDown
                          className={`w-3.5 h-3.5 ${isPositive ? "text-red-500" : "text-blue-500"}`}
                        />
                      )}
                      <span
                        className={`text-small font-bold tabular-nums ${
                          isPositive ? "text-red-500" : "text-blue-500"
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {Math.abs(price.change_amount || 0).toLocaleString()}원
                      </span>
                      <span
                        className={`text-[11px] font-medium ${
                          isPositive ? "text-red-400" : "text-blue-400"
                        }`}
                      >
                        ({isPositive ? "+" : ""}
                        {price.change_percent?.toFixed(2)}%)
                      </span>
                    </div>
                  )}
                  {isZero && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-lg">
                      <span className="text-small font-medium text-gray-500 tabular-nums">
                        변동없음
                      </span>
                    </div>
                  )}

                  {/* 1돈 가격 - 회색 배경으로 구분 */}
                  <div className="px-2.5 py-1 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-500">1돈(3.75g)</span>
                      <span className="text-small font-bold text-gray-900 tabular-nums">
                        {price.price_per_don.toLocaleString()}원
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 시세 차트/테이블 섹션 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-8">
        {/* 헤더 */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-[20px] font-bold text-gray-900 mb-1">
                {selectedType === "24K"
                  ? "24K 순금"
                  : selectedType === "18K"
                  ? "18K 금"
                  : selectedType === "14K"
                  ? "14K 금"
                  : selectedType === "Platinum"
                  ? "백금"
                  : "은"}{" "}
                시세 추이
              </h2>
              <p className="text-caption text-gray-500">
                국내{" "}
                {selectedType === "Platinum"
                  ? "백금"
                  : selectedType === "Silver"
                  ? "은"
                  : "금"}{" "}
                시세 변동 그래프
              </p>
            </div>

            {/* 컨트롤 영역 */}
            <div className="flex items-center gap-3">
              {/* 차트/테이블 토글 */}
              <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setViewMode("chart")}
                  className={`px-3 py-1.5 text-small font-medium rounded-md transition-all duration-200 ${
                    viewMode === "chart"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  차트
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-1.5 text-small font-medium rounded-md transition-all duration-200 ${
                    viewMode === "table"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  표
                </button>
              </div>

              {/* 기간 선택 */}
              <div className="flex items-center gap-1.5">
                {(["1주", "1개월", "3개월", "1년", "전체"] as const).map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-3 py-1.5 text-small font-medium rounded-lg transition-all duration-200 ${
                      selectedPeriod === period
                        ? "bg-[#C9A227] text-white shadow-md"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 차트/테이블 영역 */}
        <div className="p-6">
          {viewMode === "chart" ? (
            <>
              {selectedPrice ? (
                <GoldPriceChart
                  type={selectedType}
                  currentPrice={selectedPrice.sell_price}
                  period={selectedPeriod}
                />
              ) : (
                <div className="relative h-[320px] rounded-xl border border-gray-100 bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-[16px] font-semibold text-gray-400 mb-2">데이터 로딩중</p>
                    <p className="text-caption text-gray-400">잠시만 기다려주세요</p>
                  </div>
                </div>
              )}

              {/* 차트 하단 통계 요약 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
                <div className="text-center lg:text-left">
                  <p className="text-[12px] text-gray-500 mb-1.5 font-medium">기간 최고가</p>
                  <p className="text-[18px] font-bold text-gray-900 tabular-nums">
                    {selectedPrice ? (selectedPrice.sell_price + 6000).toLocaleString() : "-"}원
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">11/15</p>
                </div>
                <div className="text-center lg:text-left">
                  <p className="text-[12px] text-gray-500 mb-1.5 font-medium">기간 최저가</p>
                  <p className="text-[18px] font-bold text-gray-900 tabular-nums">
                    {selectedPrice ? (selectedPrice.sell_price - 7000).toLocaleString() : "-"}원
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">11/03</p>
                </div>
                <div className="text-center lg:text-left">
                  <p className="text-[12px] text-gray-500 mb-1.5 font-medium">기간 평균가</p>
                  <p className="text-[18px] font-bold text-gray-900 tabular-nums">
                    {selectedPrice ? (selectedPrice.sell_price - 800).toLocaleString() : "-"}원
                  </p>
                </div>
                <div className="text-center lg:text-left">
                  <p className="text-[12px] text-gray-500 mb-1.5 font-medium">기간 변동폭</p>
                  <p className="text-[18px] font-bold text-red-500 tabular-nums">+1.57%</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">+7,000원</p>
                </div>
              </div>
            </>
          ) : (
            <>
              {selectedPrice && (
                <PriceTableHistory
                  type={selectedType}
                  period={selectedPeriod}
                  currentPrice={selectedPrice.sell_price}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* 시세 계산기 */}
      {!isLoading && prices.length > 0 && (
        <div className="mb-8">
          <PriceCalculator prices={prices} />
        </div>
      )}

      {/* 근처 매입 가능한 금은방 섹션 */}
      <div className="mb-8">
        <div className="bg-gradient-to-br from-[#FEF9E7] to-orange-50 rounded-2xl p-6 border border-[#C9A227]/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-[#C9A227] rounded-xl flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-[18px] font-bold text-gray-900">근처 매입 금은방</h3>
              <p className="text-small text-gray-600">내 주변 금 매입 가능한 매장 찾기</p>
            </div>
          </div>
          <p className="text-caption text-gray-600 mb-4">
            보유하신 금을 판매하고 싶으신가요? 가까운 매장에서 최적의 가격으로 매입해드립니다.
          </p>
          <Button
            onClick={() => router.push("/stores?buying=true")}
            variant="brand-primary"
            size="lg"
            className="w-full"
          >
            근처 매입 매장 보기
          </Button>
        </div>
      </div>

      {/* 정보 섹션 */}
      <div className="bg-gray-50 rounded-2xl p-6">
        <h3 className="text-[18px] font-bold text-gray-900 mb-4">금시세 안내</h3>
        <div className="space-y-3 text-caption text-gray-600">
          <p>• 위 시세는 실시간으로 업데이트되며, 매장별로 실제 거래 가격은 다를 수 있습니다.</p>
          <p>• 1돈 = 3.75g 기준으로 계산된 가격입니다.</p>
          <p>• 매입가와 매도가는 각 매장의 정책에 따라 차이가 있을 수 있습니다.</p>
          <p>• 정확한 시세는 매장에 직접 문의하시기 바랍니다.</p>
        </div>
      </div>
      </Container>
    </main>
    </>
  );
}
