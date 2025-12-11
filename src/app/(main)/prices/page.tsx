"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { getLatestGoldPricesAction, getGoldPriceHistoryAction } from "@/actions/goldPrices";
import type { GoldPrice, GoldPriceHistory, GoldType, HistoryPeriod } from "@/types/goldPrices";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PricesPage() {
  const [prices, setPrices] = useState<GoldPrice[]>([]);
  const [selectedType, setSelectedType] = useState<GoldType>("24K");
  const [selectedPeriod, setSelectedPeriod] = useState<HistoryPeriod>("1개월");
  const [history, setHistory] = useState<GoldPriceHistory[]>([]);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [pricesError, setPricesError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // 최신 금시세 로드
  const loadPrices = async () => {
    setIsLoadingPrices(true);
    setPricesError(null);

    try {
      const result = await getLatestGoldPricesAction();

      if (result.success && result.data) {
        setPrices(result.data);
      } else {
        setPricesError(result.error || "금시세를 불러올 수 없습니다.");
      }
    } catch (err) {
      console.error("Load prices error:", err);
      setPricesError("금시세를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoadingPrices(false);
    }
  };

  // 금시세 히스토리 로드
  const loadHistory = async () => {
    setIsLoadingHistory(true);
    setHistoryError(null);

    try {
      const result = await getGoldPriceHistoryAction(selectedType, selectedPeriod);

      if (result.success && result.data) {
        setHistory(result.data);
      } else {
        setHistoryError(result.error || "금시세 히스토리를 불러올 수 없습니다.");
      }
    } catch (err) {
      console.error("Load history error:", err);
      setHistoryError("금시세 히스토리를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadPrices();
  }, []);

  useEffect(() => {
    loadHistory();
  }, [selectedType, selectedPeriod]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ko-KR").format(price);
  };

  const getPriceChangeColor = (changeAmount?: number) => {
    if (!changeAmount) return "text-gray-600";
    return changeAmount > 0 ? "text-red-600" : changeAmount < 0 ? "text-blue-600" : "text-gray-600";
  };

  const getPriceChangeIcon = (changeAmount?: number) => {
    if (!changeAmount) return null;
    return changeAmount > 0 ? (
      <TrendingUp className="h-4 w-4" />
    ) : changeAmount < 0 ? (
      <TrendingDown className="h-4 w-4" />
    ) : null;
  };

  const goldTypeLabels: Record<GoldType, string> = {
    "24K": "24K 금",
    "18K": "18K 금",
    "14K": "14K 금",
    Platinum: "백금",
    Silver: "은",
  };

  const periodLabels: Record<HistoryPeriod, string> = {
    "1주": "1주일",
    "1개월": "1개월",
    "3개월": "3개월",
    "1년": "1년",
    "전체": "전체",
  };

  return (
    <main className="flex-grow bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* 페이지 헤더 */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">금시세</h1>
            <p className="text-gray-600">실시간 금 시세를 확인하세요</p>
          </div>
          <Button
            onClick={loadPrices}
            disabled={isLoadingPrices}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingPrices ? "animate-spin" : ""}`} />
            새로고침
          </Button>
        </div>

        {/* 에러 메시지 */}
        {pricesError && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>금시세를 불러오지 못했습니다</AlertTitle>
            <AlertDescription>{pricesError}</AlertDescription>
          </Alert>
        )}

        {/* 로딩 상태 */}
        {isLoadingPrices ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-gray-900" />
          </div>
        ) : (
          <>
            {/* 현재 금시세 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
              {prices.map((price) => (
                <Card key={price.type} className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-bold text-gray-900">
                        {goldTypeLabels[price.type]}
                      </CardTitle>
                      {price.change_amount !== undefined && price.change_amount !== 0 && (
                        <Badge
                          variant="outline"
                          className={`${getPriceChangeColor(price.change_amount)} border-current`}
                        >
                          <div className="flex items-center gap-1">
                            {getPriceChangeIcon(price.change_amount)}
                            <span>
                              {price.change_percent ? `${price.change_percent.toFixed(2)}%` : ""}
                            </span>
                          </div>
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">매입가</span>
                      <span className="text-lg font-semibold text-gray-900">
                        {formatPrice(price.buy_price)}원
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-600">판매가</span>
                      <span className="text-lg font-semibold text-gray-900">
                        {formatPrice(price.sell_price)}원
                      </span>
                    </div>
                    {price.change_amount !== undefined && (
                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">전일 대비</span>
                          <span
                            className={`text-sm font-medium ${getPriceChangeColor(price.change_amount)}`}
                          >
                            {price.change_amount > 0 ? "+" : ""}
                            {formatPrice(price.change_amount)}원
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 금시세 히스토리 */}
            <Card className="border-gray-200">
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-xl font-bold text-gray-900">
                    금시세 추이
                  </CardTitle>
                  <div className="flex gap-3">
                    <Select
                      value={selectedType}
                      onValueChange={(value) => setSelectedType(value as GoldType)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="금 종류 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(goldTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={selectedPeriod}
                      onValueChange={(value) => setSelectedPeriod(value as HistoryPeriod)}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="기간 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(periodLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {historyError ? (
                  <Alert variant="destructive">
                    <AlertTitle>히스토리를 불러오지 못했습니다</AlertTitle>
                    <AlertDescription>{historyError}</AlertDescription>
                  </Alert>
                ) : isLoadingHistory ? (
                  <div className="flex justify-center items-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-gray-900" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    히스토리 데이터가 없습니다.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">날짜</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">매입가</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">판매가</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">평균가</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {history.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-900">
                              {new Intl.DateTimeFormat("ko-KR", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                              }).format(new Date(item.date))}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-900">
                              {formatPrice(item.buy_price)}원
                            </td>
                            <td className="px-4 py-3 text-right text-gray-900">
                              {formatPrice(item.sell_price)}원
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900">
                              {formatPrice(item.avg_price)}원
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
