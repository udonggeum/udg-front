"use client";

import { useMemo, useState, useEffect } from "react";
import type { GoldType, HistoryPeriod } from "@/types/goldPrices";
import { getGoldPriceHistoryAction } from "@/actions/goldPrices";

interface PriceHistoryData {
  date: string;
  price: number;
  change: number;
  changePercent: number;
}

interface PriceTableHistoryProps {
  type: GoldType;
  period: HistoryPeriod;
  currentPrice?: number;
}

export default function PriceTableHistory({ type, period }: PriceTableHistoryProps) {
  const [rawHistoryData, setRawHistoryData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      const result = await getGoldPriceHistoryAction(type, period);
      if (result.success && result.data) {
        setRawHistoryData(result.data);
      }
      setIsLoading(false);
    };

    loadHistory();
  }, [type, period]);

  // 전일 대비 변동률 계산
  const historyData = useMemo((): PriceHistoryData[] => {
    if (!rawHistoryData || rawHistoryData.length === 0) {
      return [];
    }

    return rawHistoryData
      .map((item, index) => {
        const price = Math.round(item.sell_price);

        // 전일 대비 계산 (첫 번째 항목은 이전 데이터 없음)
        let change = 0;
        let changePercent = 0;

        if (index > 0) {
          const prevPrice = rawHistoryData[index - 1].sell_price;
          change = price - prevPrice;
          changePercent = (change / prevPrice) * 100;
        }

        return {
          date: item.date,
          price,
          change,
          changePercent,
        };
      })
      .reverse(); // 최신순으로 정렬 (오늘이 맨 위)
  }, [rawHistoryData]);

  const getTypeName = (type: GoldType): string => {
    switch (type) {
      case "24K":
        return "24K 순금";
      case "18K":
        return "18K 금";
      case "14K":
        return "14K 금";
      case "Platinum":
        return "백금";
      case "Silver":
        return "은";
      default:
        return type;
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
    return `${month}/${day} (${dayOfWeek})`;
  };

  // 로딩 상태 처리
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-[18px] font-bold text-gray-900">
            {getTypeName(type)} 시세 이력 ({period})
          </h2>
        </div>
        <div className="p-12 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
            <p className="text-caption text-gray-400">데이터 로딩중...</p>
          </div>
        </div>
      </div>
    );
  }

  // 데이터 없음 처리
  if (!historyData || historyData.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-[18px] font-bold text-gray-900">
            {getTypeName(type)} 시세 이력 ({period})
          </h2>
        </div>
        <div className="p-12 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[16px] font-semibold text-gray-400 mb-2">데이터 없음</p>
            <p className="text-caption text-gray-400">선택한 기간의 시세 데이터가 없습니다</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 통계 요약 */}
      <div className="mb-4 text-center">
        <p className="text-small text-gray-500">
          최근 <span className="font-semibold text-gray-700">{historyData.length}일</span>간의 시세 변동
        </p>
      </div>

      {/* 테이블 - 스크롤 가능 */}
      <div className="overflow-x-auto overflow-y-auto max-h-[500px] rounded-lg border border-gray-100">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 text-[12px] text-gray-500 font-medium">
              <th className="py-3 px-6 text-left">날짜</th>
              <th className="py-3 px-4 text-right">가격 (원/g)</th>
              <th className="py-3 px-4 text-right">전일대비</th>
              <th className="py-3 px-4 text-right">등락률</th>
            </tr>
          </thead>
          <tbody className="text-caption bg-white">
            {historyData.map((row, index) => {
              const isPositive = row.change > 0;
              const isNegative = row.change < 0;
              const isToday = index === 0;

              return (
                <tr
                  key={row.date}
                  className={`border-b border-gray-50 hover:bg-gray-50 transition-colors duration-200 ${
                    isToday ? "bg-[#FEF9E7]" : ""
                  }`}
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{formatDate(row.date)}</span>
                      {isToday && (
                        <span className="px-2 py-0.5 bg-[#C9A227] text-white text-[10px] font-bold rounded">
                          오늘
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right font-semibold text-gray-900 tabular-nums">
                    {row.price.toLocaleString()}
                  </td>
                  <td
                    className={`py-4 px-4 text-right font-medium tabular-nums ${
                      isPositive ? "text-red-500" : isNegative ? "text-blue-500" : "text-gray-400"
                    }`}
                  >
                    {isPositive ? "▲" : isNegative ? "▼" : "-"} {Math.abs(row.change).toLocaleString()}
                  </td>
                  <td
                    className={`py-4 px-4 text-right font-medium tabular-nums ${
                      isPositive ? "text-red-500" : isNegative ? "text-blue-500" : "text-gray-400"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {row.changePercent.toFixed(2)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 푸터 */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-[12px] text-gray-500 text-center">
        * 위 시세는 참고용이며, 실제 거래 시세는 매장별로 상이할 수 있습니다.
      </div>
    </>
  );
}
