"use client";

import { useState, useMemo } from "react";
import { Calculator, ArrowRight } from "lucide-react";
import type { GoldType } from "@/types/goldPrices";

interface PriceCalculatorProps {
  prices: Array<{
    type: GoldType;
    buy_price: number;
    sell_price: number;
  }>;
}

type WeightUnit = "g" | "돈" | "oz";

// 금속 순도 매핑 (백분율)
const PURITY_MAP: Record<GoldType, number> = {
  "24K": 99.99,
  "18K": 75.0,
  "14K": 58.5,
  Platinum: 99.95,
  Silver: 99.9,
};

export default function PriceCalculator({ prices }: PriceCalculatorProps) {
  const [selectedType, setSelectedType] = useState<GoldType>("24K");
  const [weight, setWeight] = useState<string>("");
  const [unit, setUnit] = useState<WeightUnit>("돈");

  // 순도 변환 모드
  const [purityConversionEnabled, setPurityConversionEnabled] = useState<boolean>(false);
  const [targetPurity, setTargetPurity] = useState<GoldType>("18K");

  // 선택된 금 유형의 가격 정보
  const selectedPrice = prices.find((p) => p.type === selectedType);

  // 무게를 그램으로 변환
  const weightInGrams = useMemo(() => {
    const numWeight = parseFloat(weight);
    if (isNaN(numWeight) || numWeight <= 0) return 0;

    switch (unit) {
      case "g":
        return numWeight;
      case "돈":
        return numWeight * 3.75; // 1돈 = 3.75g
      case "oz":
        return numWeight * 31.1035; // 1oz = 31.1035g
      default:
        return 0;
    }
  }, [weight, unit]);

  // 순도 변환 계산
  const convertedWeight = useMemo(() => {
    if (!purityConversionEnabled || weightInGrams === 0) return weightInGrams;

    const sourcePurity = PURITY_MAP[selectedType];
    const targetPurityValue = PURITY_MAP[targetPurity];

    // 순도 변환: 원본 무게 × (원본 순도 / 목표 순도)
    return (weightInGrams * sourcePurity) / targetPurityValue;
  }, [purityConversionEnabled, weightInGrams, selectedType, targetPurity]);

  // 매입/매도 예상가 계산
  const buyEstimate = useMemo(() => {
    if (!selectedPrice || weightInGrams === 0) return 0;

    if (purityConversionEnabled) {
      // 순도 변환 모드: 목표 순도의 가격으로 계산
      const targetPrice = prices.find((p) => p.type === targetPurity);
      if (!targetPrice) return 0;
      return Math.round(targetPrice.buy_price * convertedWeight);
    }

    return Math.round(selectedPrice.buy_price * weightInGrams);
  }, [selectedPrice, weightInGrams, purityConversionEnabled, convertedWeight, targetPurity, prices]);

  const sellEstimate = useMemo(() => {
    if (!selectedPrice || weightInGrams === 0) return 0;

    if (purityConversionEnabled) {
      // 순도 변환 모드: 목표 순도의 가격으로 계산
      const targetPrice = prices.find((p) => p.type === targetPurity);
      if (!targetPrice) return 0;
      return Math.round(targetPrice.sell_price * convertedWeight);
    }

    return Math.round(selectedPrice.sell_price * weightInGrams);
  }, [selectedPrice, weightInGrams, purityConversionEnabled, convertedWeight, targetPurity, prices]);

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

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* 헤더 */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <Calculator className="w-5 h-5 text-[#C9A227]" />
          <h2 className="text-[18px] font-bold text-gray-900">시세 계산기</h2>
        </div>
        <p className="text-small text-gray-500">
          무게를 입력하면 예상 매입/매도 가격을 확인할 수 있습니다.
        </p>
      </div>

      {/* 계산기 본문 */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 입력 영역 */}
          <div className="space-y-4">
            {/* 금 유형 선택 */}
            <div>
              <label htmlFor="gold-type-select" className="block text-small font-medium text-gray-700 mb-2">금 유형</label>
              <select
                id="gold-type-select"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as GoldType)}
                aria-label="금 유형 선택"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-caption focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent transition-all"
              >
                {prices.map((price) => (
                  <option key={price.type} value={price.type}>
                    {getTypeName(price.type)}
                  </option>
                ))}
              </select>
            </div>

            {/* 무게 입력 */}
            <div>
              <label htmlFor="weight-input" className="block text-small font-medium text-gray-700 mb-2">무게</label>
              <div className="flex gap-2">
                <input
                  id="weight-input"
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  aria-label="무게 입력"
                  aria-describedby="weight-help-text"
                  className="flex-1 min-w-0 px-4 py-3 border border-gray-200 rounded-xl text-caption focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent transition-all tabular-nums"
                />
                <select
                  id="unit-select"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as WeightUnit)}
                  aria-label="무게 단위 선택"
                  className="flex-shrink-0 px-4 py-3 border border-gray-200 rounded-xl text-caption focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent transition-all"
                >
                  <option value="g">g</option>
                  <option value="돈">돈</option>
                  <option value="oz">oz</option>
                </select>
              </div>
              <p id="weight-help-text" className="text-[11px] text-gray-400 mt-1">* 1돈 = 3.75g, 1oz = 31.1035g</p>
            </div>

            {/* 그램 환산 정보 */}
            {weightInGrams > 0 && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-[12px] text-gray-500">
                  입력 무게:{" "}
                  <span className="font-semibold text-gray-900 tabular-nums">
                    {weightInGrams.toFixed(2)}g
                  </span>
                </p>
              </div>
            )}

            {/* 순도 변환 옵션 */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="purityConversion"
                  checked={purityConversionEnabled}
                  onChange={(e) => setPurityConversionEnabled(e.target.checked)}
                  className="w-4 h-4 text-[#C9A227] bg-gray-100 border-gray-300 rounded focus:ring-[#C9A227]"
                />
                <label
                  htmlFor="purityConversion"
                  className="text-small font-medium text-gray-700 cursor-pointer"
                >
                  순도 변환 계산하기
                </label>
              </div>

              {purityConversionEnabled && (
                <div className="space-y-2">
                  <label className="block text-small font-medium text-gray-700">
                    변환할 순도 선택
                  </label>
                  <select
                    value={targetPurity}
                    onChange={(e) => setTargetPurity(e.target.value as GoldType)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-caption focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent transition-all"
                  >
                    {prices
                      .filter((p) => p.type !== selectedType)
                      .map((price) => (
                        <option key={price.type} value={price.type}>
                          {getTypeName(price.type)} ({PURITY_MAP[price.type]}%)
                        </option>
                      ))}
                  </select>

                  {/* 순도 변환 계산 결과 */}
                  {weightInGrams > 0 && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 text-[12px] text-blue-700 mb-1">
                        <span className="font-semibold">{getTypeName(selectedType)}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span className="font-semibold">{getTypeName(targetPurity)}</span>
                      </div>
                      <p className="text-[12px] text-blue-600">
                        {weightInGrams.toFixed(2)}g ({PURITY_MAP[selectedType]}%) ={" "}
                        <span className="font-bold tabular-nums">{convertedWeight.toFixed(2)}g</span>{" "}
                        ({PURITY_MAP[targetPurity]}%)
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 결과 영역 */}
          <div className="space-y-4">
            {/* 매입 예상가 (살 때) */}
            <div className="p-4 bg-gradient-to-br from-[#FEF9E7] to-[#FDF8E8] rounded-xl border border-[#C9A227]/30">
              <p className="text-small font-medium text-[#8A6A00] mb-1">살 때 예상가 (매입가)</p>
              <p className="text-[28px] font-bold text-[#8A6A00] tabular-nums">
                {buyEstimate.toLocaleString()}
                <span className="text-[16px] ml-1">원</span>
              </p>
              {selectedPrice && weightInGrams > 0 && (
                <p className="text-[11px] text-[#8A6A00]/80 mt-1">
                  {purityConversionEnabled
                    ? `${prices
                        .find((p) => p.type === targetPurity)
                        ?.buy_price.toLocaleString()}원/g × ${convertedWeight.toFixed(2)}g (${getTypeName(
                        targetPurity
                      )})`
                    : `${selectedPrice.buy_price.toLocaleString()}원/g × ${weightInGrams.toFixed(
                        2
                      )}g`}
                </p>
              )}
            </div>

            {/* 매도 예상가 (팔 때) */}
            <div className="p-4 bg-gradient-to-br from-[#C9A227] to-[#B8941F] rounded-xl border border-[#8A6A00]">
              <p className="text-small font-medium text-white/90 mb-1">팔 때 예상가 (매도가)</p>
              <p className="text-[28px] font-bold text-white tabular-nums">
                {sellEstimate.toLocaleString()}
                <span className="text-[16px] ml-1">원</span>
              </p>
              {selectedPrice && weightInGrams > 0 && (
                <p className="text-[11px] text-white/80 mt-1">
                  {purityConversionEnabled
                    ? `${prices
                        .find((p) => p.type === targetPurity)
                        ?.sell_price.toLocaleString()}원/g × ${convertedWeight.toFixed(2)}g (${getTypeName(
                        targetPurity
                      )})`
                    : `${selectedPrice.sell_price.toLocaleString()}원/g × ${weightInGrams.toFixed(
                        2
                      )}g`}
                </p>
              )}
            </div>

            {/* 매입/매도 차액 */}
            {weightInGrams > 0 && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-[12px] text-gray-500">
                  매입/매도 차액:{" "}
                  <span className="font-semibold text-gray-900 tabular-nums">
                    {(sellEstimate - buyEstimate).toLocaleString()}원
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 푸터 */}
      <div className="p-4 bg-gray-50 text-[12px] text-gray-500">
        * 위 계산 결과는 참고용이며, 실제 거래가는 매장 상황에 따라 달라질 수 있습니다.
      </div>
    </div>
  );
}
