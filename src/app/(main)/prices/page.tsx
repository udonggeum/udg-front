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
import { isWebView } from "@/lib/webview";

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
  const [inWebView, setInWebView] = useState(false);

  // 웹뷰 환경 감지
  useEffect(() => {
    setInWebView(isWebView());
  }, []);

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

      <main className={inWebView ? "py-4" : "py-8"}>
        <Container>
      {/* 페이지 헤더 */}
      <div className={inWebView ? "mb-4" : "mb-8"}>
        <div className={`flex items-center mb-2 ${inWebView ? "gap-2" : "gap-3"}`}>
          <h1 className={`font-bold text-gray-900 ${inWebView ? "text-[20px]" : "text-[28px]"}`}>실시간 금시세</h1>
          <div className={`flex items-center bg-green-50 rounded-full ${
            inWebView ? "gap-1 px-2 py-1" : "gap-1.5 px-3 py-1.5"
          }`}>
            <span className={`bg-green-500 rounded-full animate-pulse ${inWebView ? "w-1.5 h-1.5" : "w-2 h-2"}`}></span>
            <span className={`font-semibold text-green-700 ${inWebView ? "text-[10px]" : "text-[12px]"}`}>LIVE</span>
          </div>
        </div>
        <p className={`text-gray-500 ${inWebView ? "text-xs" : "text-body"}`}>{currentTime} 기준</p>
      </div>

      {/* 메인 시세 카드 - 개선된 UI */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 ${
          inWebView ? "gap-2 mb-4" : "gap-3 mb-8"
        }`}>
          {prices.map((price) => {
            const isPositive = (price.change_percent || 0) > 0;
            const isZero = (price.change_percent || 0) === 0;
            const isSelected = selectedType === price.type;

            return (
              <div
                key={price.type}
                onClick={() => setSelectedType(price.type)}
                className={`relative bg-white rounded-xl cursor-pointer transition-shadow duration-200 ${
                  inWebView ? "p-3" : "p-5"
                } ${
                  isSelected
                    ? "ring-2 ring-[#C9A227] shadow-lg"
                    : "shadow-sm md:hover:shadow-md"
                }`}
              >
                {/* 선택 표시 */}
                {isSelected && (
                  <div className={`absolute ${inWebView ? "top-2 right-2" : "top-3 right-3"}`}>
                    <div className={`bg-[#C9A227] rounded-full flex items-center justify-center ${
                      inWebView ? "w-4 h-4" : "w-5 h-5"
                    }`}>
                      <svg className={`text-white ${inWebView ? "w-2.5 h-2.5" : "w-3 h-3"}`} fill="currentColor" viewBox="0 0 20 20">
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
                <div className={`flex items-center ${inWebView ? "gap-1.5 mb-2" : "gap-2 mb-3"}`}>
                  <div
                    className={`${price.badge_bg} rounded-lg flex items-center justify-center ${
                      inWebView ? "w-6 h-6" : "w-8 h-8"
                    }`}
                  >
                    <span className={`font-bold ${price.badge_text} ${inWebView ? "text-[9px]" : "text-[11px]"}`}>
                      {price.type}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold text-gray-900 ${inWebView ? "text-[11px]" : "text-caption"}`}>
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
                    <p className={`text-gray-400 ${inWebView ? "text-[9px]" : "text-[10px]"}`}>{price.purity}</p>
                  </div>
                </div>

                {/* 가격 - 더 크고 명확하게 */}
                <div className={inWebView ? "mb-2" : "mb-3"}>
                  <div className="flex items-baseline gap-1">
                    <span className={`font-bold text-gray-900 tabular-nums leading-none ${
                      inWebView ? "text-[18px]" : "text-[24px]"
                    }`}>
                      {price.sell_price.toLocaleString()}
                    </span>
                    <span className={`text-gray-500 ${inWebView ? "text-[10px]" : "text-[12px]"}`}>원</span>
                  </div>
                  <div className={`text-gray-400 mt-0.5 ${inWebView ? "text-[9px]" : "text-[11px]"}`}>그램당 매도가</div>
                </div>

                {/* 변동률 - 더 눈에 띄게 */}
                <div className={inWebView ? "space-y-1" : "space-y-1.5"}>
                  {!isZero && (
                    <div
                      className={`flex items-center rounded-lg ${
                        isPositive ? "bg-red-50" : "bg-blue-50"
                      } ${inWebView ? "gap-1 px-2 py-0.5" : "gap-1.5 px-2.5 py-1"}`}
                    >
                      {isPositive ? (
                        <ChevronUp
                          className={`${isPositive ? "text-red-500" : "text-blue-500"} ${
                            inWebView ? "w-3 h-3" : "w-3.5 h-3.5"
                          }`}
                        />
                      ) : (
                        <ChevronDown
                          className={`${isPositive ? "text-red-500" : "text-blue-500"} ${
                            inWebView ? "w-3 h-3" : "w-3.5 h-3.5"
                          }`}
                        />
                      )}
                      <span
                        className={`font-bold tabular-nums ${
                          isPositive ? "text-red-500" : "text-blue-500"
                        } ${inWebView ? "text-[11px]" : "text-small"}`}
                      >
                        {isPositive ? "+" : ""}
                        {Math.abs(price.change_amount || 0).toLocaleString()}원
                      </span>
                      <span
                        className={`font-medium ${
                          isPositive ? "text-red-400" : "text-blue-400"
                        } ${inWebView ? "text-[9px]" : "text-[11px]"}`}
                      >
                        ({isPositive ? "+" : ""}
                        {price.change_percent?.toFixed(2)}%)
                      </span>
                    </div>
                  )}
                  {isZero && (
                    <div className={`flex items-center bg-gray-50 rounded-lg ${
                      inWebView ? "gap-1 px-2 py-0.5" : "gap-1.5 px-2.5 py-1"
                    }`}>
                      <span className={`font-medium text-gray-500 tabular-nums ${
                        inWebView ? "text-[11px]" : "text-small"
                      }`}>
                        변동없음
                      </span>
                    </div>
                  )}

                  {/* 1돈 가격 - 회색 배경으로 구분 */}
                  <div className={`bg-gray-50 rounded-lg ${inWebView ? "px-2 py-0.5" : "px-2.5 py-1"}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-gray-500 ${inWebView ? "text-[9px]" : "text-[11px]"}`}>1돈(3.75g)</span>
                      <span className={`font-bold text-gray-900 tabular-nums ${
                        inWebView ? "text-[11px]" : "text-small"
                      }`}>
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
      <div className={`bg-white rounded-2xl shadow-sm overflow-hidden ${inWebView ? "mb-4" : "mb-8"}`}>
        {/* 헤더 */}
        <div className={`border-b border-gray-100 ${inWebView ? "p-3" : "p-6"}`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className={`font-bold text-gray-900 mb-1 ${inWebView ? "text-[16px]" : "text-[20px]"}`}>
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
              <p className={`text-gray-500 ${inWebView ? "text-[11px]" : "text-caption"}`}>
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
            <div className={`flex items-center ${inWebView ? "gap-2" : "gap-3"}`}>
              {/* 차트/테이블 토글 */}
              <div className={`inline-flex rounded-lg border border-gray-200 bg-gray-50 ${
                inWebView ? "p-0.5" : "p-1"
              }`}>
                <button
                  type="button"
                  onClick={() => setViewMode("chart")}
                  className={`font-medium rounded-md transition-all duration-200 ${
                    inWebView ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-small"
                  } ${
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
                  className={`font-medium rounded-md transition-all duration-200 ${
                    inWebView ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-small"
                  } ${
                    viewMode === "table"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  표
                </button>
              </div>

              {/* 기간 선택 */}
              <div className={`flex items-center ${inWebView ? "gap-1" : "gap-1.5"}`}>
                {(["1주", "1개월", "3개월", "1년", "전체"] as const).map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setSelectedPeriod(period)}
                    className={`font-medium rounded-lg transition-all duration-200 ${
                      inWebView ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-small"
                    } ${
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
        <div className={inWebView ? "p-3" : "p-6"}>
          {viewMode === "chart" ? (
            <>
              {selectedPrice ? (
                <GoldPriceChart
                  type={selectedType}
                  currentPrice={selectedPrice.sell_price}
                  period={selectedPeriod}
                />
              ) : (
                <div className={`relative rounded-xl border border-gray-100 bg-gradient-to-b from-gray-50 to-white flex items-center justify-center ${
                  inWebView ? "h-[240px]" : "h-[320px]"
                }`}>
                  <div className="text-center">
                    <p className={`font-semibold text-gray-400 mb-2 ${inWebView ? "text-sm" : "text-[16px]"}`}>데이터 로딩중</p>
                    <p className={`text-gray-400 ${inWebView ? "text-[11px]" : "text-caption"}`}>잠시만 기다려주세요</p>
                  </div>
                </div>
              )}

              {/* 차트 하단 통계 요약 */}
              <div className={`grid grid-cols-2 lg:grid-cols-4 border-t border-gray-100 ${
                inWebView ? "gap-2 mt-3 pt-3" : "gap-4 mt-6 pt-6"
              }`}>
                <div className="text-center lg:text-left">
                  <p className={`text-gray-500 font-medium ${inWebView ? "mb-1 text-[10px]" : "mb-1.5 text-[12px]"}`}>기간 최고가</p>
                  <p className={`font-bold text-gray-900 tabular-nums ${inWebView ? "text-sm" : "text-[18px]"}`}>
                    {selectedPrice ? (selectedPrice.sell_price + 6000).toLocaleString() : "-"}원
                  </p>
                  <p className={`text-gray-400 mt-0.5 ${inWebView ? "text-[9px]" : "text-[11px]"}`}>11/15</p>
                </div>
                <div className="text-center lg:text-left">
                  <p className={`text-gray-500 font-medium ${inWebView ? "mb-1 text-[10px]" : "mb-1.5 text-[12px]"}`}>기간 최저가</p>
                  <p className={`font-bold text-gray-900 tabular-nums ${inWebView ? "text-sm" : "text-[18px]"}`}>
                    {selectedPrice ? (selectedPrice.sell_price - 7000).toLocaleString() : "-"}원
                  </p>
                  <p className={`text-gray-400 mt-0.5 ${inWebView ? "text-[9px]" : "text-[11px]"}`}>11/03</p>
                </div>
                <div className="text-center lg:text-left">
                  <p className={`text-gray-500 font-medium ${inWebView ? "mb-1 text-[10px]" : "mb-1.5 text-[12px]"}`}>기간 평균가</p>
                  <p className={`font-bold text-gray-900 tabular-nums ${inWebView ? "text-sm" : "text-[18px]"}`}>
                    {selectedPrice ? (selectedPrice.sell_price - 800).toLocaleString() : "-"}원
                  </p>
                </div>
                <div className="text-center lg:text-left">
                  <p className={`text-gray-500 font-medium ${inWebView ? "mb-1 text-[10px]" : "mb-1.5 text-[12px]"}`}>기간 변동폭</p>
                  <p className={`font-bold text-red-500 tabular-nums ${inWebView ? "text-sm" : "text-[18px]"}`}>+1.57%</p>
                  <p className={`text-gray-400 mt-0.5 ${inWebView ? "text-[9px]" : "text-[11px]"}`}>+7,000원</p>
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
        <div className={inWebView ? "mb-4" : "mb-8"}>
          <PriceCalculator prices={prices} />
        </div>
      )}

      {/* 근처 매입 가능한 금은방 섹션 */}
      <div className={inWebView ? "mb-4" : "mb-8"}>
        <div className={`bg-gradient-to-br from-[#FEF9E7] to-orange-50 rounded-2xl border border-[#C9A227]/30 ${
          inWebView ? "p-4" : "p-6"
        }`}>
          <div className={`flex items-center mb-3 ${inWebView ? "gap-2" : "gap-3"}`}>
            <div className={`bg-[#C9A227] rounded-xl flex items-center justify-center ${
              inWebView ? "w-10 h-10" : "w-12 h-12"
            }`}>
              <MapPin className={`text-white ${inWebView ? "w-5 h-5" : "w-6 h-6"}`} />
            </div>
            <div>
              <h3 className={`font-bold text-gray-900 ${inWebView ? "text-[15px]" : "text-[18px]"}`}>근처 매입 금은방</h3>
              <p className={`text-gray-600 ${inWebView ? "text-[11px]" : "text-small"}`}>내 주변 금 매입 가능한 매장 찾기</p>
            </div>
          </div>
          <p className={`text-gray-600 mb-4 ${inWebView ? "text-[11px]" : "text-caption"}`}>
            보유하신 금을 판매하고 싶으신가요? 가까운 매장에서 최적의 가격으로 매입해드립니다.
          </p>
          <Button
            onClick={() => router.push("/stores?buying=true")}
            variant="brand-primary"
            size={inWebView ? "default" : "lg"}
            className="w-full"
          >
            근처 매입 매장 보기
          </Button>
        </div>
      </div>

      {/* 정보 섹션 */}
      <div className={`bg-gray-50 rounded-2xl ${inWebView ? "p-4" : "p-6"}`}>
        <h3 className={`font-bold text-gray-900 mb-4 ${inWebView ? "text-[15px]" : "text-[18px]"}`}>금시세 안내</h3>
        <div className={`text-gray-600 ${inWebView ? "space-y-2 text-[11px]" : "space-y-3 text-caption"}`}>
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
