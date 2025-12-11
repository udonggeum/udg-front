"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { GoldType, HistoryPeriod } from "@/types/goldPrices";
import { getGoldPriceHistoryAction } from "@/actions/goldPrices";
import { useState, useEffect } from "react";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface GoldPriceChartProps {
  type: GoldType;
  currentPrice?: number;
  period: HistoryPeriod;
}

export default function GoldPriceChart({ type, period }: GoldPriceChartProps) {
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      const result = await getGoldPriceHistoryAction(type, period);
      if (result.success && result.data) {
        setHistoryData(result.data);
      }
      setIsLoading(false);
    };

    loadHistory();
  }, [type, period]);

  // 차트 데이터 가공
  const chartData = useMemo(() => {
    if (!historyData || historyData.length === 0) {
      return { labels: [], prices: [] };
    }

    // 레이블 생성
    const labels = historyData.map((item, index) => {
      const date = new Date(item.date);

      if (period === "1주") {
        const days = ["일", "월", "화", "수", "목", "금", "토"];
        return days[date.getDay()];
      } else if (period === "1개월") {
        return index % 5 === 0 ? `${date.getMonth() + 1}/${date.getDate()}` : "";
      } else if (period === "3개월") {
        return index % 15 === 0 ? `${date.getMonth() + 1}/${date.getDate()}` : "";
      } else if (period === "1년") {
        return index % 30 === 0 ? `${date.getMonth() + 1}월` : "";
      } else {
        return index % 60 === 0 ? `${date.getFullYear()}.${date.getMonth() + 1}` : "";
      }
    });

    // 가격 데이터 (매도가 사용)
    const prices = historyData.map((item) => Math.round(item.sell_price));

    return { labels, prices };
  }, [historyData, period]);

  // Chart.js 데이터 설정
  const data = {
    labels: chartData.labels,
    datasets: [
      {
        label: `${type} 시세`,
        data: chartData.prices,
        fill: true,
        borderColor:
          type === "Platinum"
            ? "rgb(156, 163, 175)"
            : type === "Silver"
            ? "rgb(148, 163, 184)"
            : "rgb(255, 215, 0)",
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 320);
          if (type === "Platinum") {
            gradient.addColorStop(0, "rgba(156, 163, 175, 0.3)");
            gradient.addColorStop(1, "rgba(156, 163, 175, 0)");
          } else if (type === "Silver") {
            gradient.addColorStop(0, "rgba(148, 163, 184, 0.3)");
            gradient.addColorStop(1, "rgba(148, 163, 184, 0)");
          } else {
            gradient.addColorStop(0, "rgba(255, 215, 0, 0.3)");
            gradient.addColorStop(1, "rgba(255, 215, 0, 0)");
          }
          return gradient;
        },
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointBackgroundColor:
          type === "Platinum"
            ? "rgb(156, 163, 175)"
            : type === "Silver"
            ? "rgb(148, 163, 184)"
            : "rgb(255, 215, 0)",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        tension: 0.4,
      },
    ],
  };

  // Chart.js 옵션 설정
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(25, 31, 40, 0.95)",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: "rgba(255, 215, 0, 0.3)",
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: function (context: any) {
            return `${context.parsed.y.toLocaleString()}원/g`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
          drawBorder: false,
        },
        ticks: {
          color: "#9E9E9E",
          font: {
            size: 11,
          },
        },
      },
      y: {
        position: "left" as const,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
          drawBorder: false,
        },
        ticks: {
          color: "#9E9E9E",
          font: {
            size: 11,
          },
          callback: function (value: any) {
            return value.toLocaleString();
          },
        },
      },
    },
  };

  // 로딩 상태 처리
  if (isLoading) {
    return (
      <div className="relative h-[320px] rounded-xl border border-gray-100 bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
          <p className="text-[14px] text-gray-400">차트 데이터 로딩중...</p>
        </div>
      </div>
    );
  }

  // 데이터 없음 처리
  if (!historyData || historyData.length === 0) {
    return (
      <div className="relative h-[320px] rounded-xl border border-gray-100 bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-[16px] font-semibold text-gray-400 mb-2">데이터 없음</p>
          <p className="text-[14px] text-gray-400">선택한 기간의 시세 데이터가 없습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[320px] rounded-xl border border-gray-100 bg-white p-4">
      <Line data={data} options={options} />
    </div>
  );
}
