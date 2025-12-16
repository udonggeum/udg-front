"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DaumPostcodeData } from "@/types/kakao";

interface AddressSearchInputProps {
  zipCode?: string;
  address?: string;
  detailAddress?: string;
  onZipCodeChange?: (value: string) => void;
  onAddressChange?: (value: string) => void;
  onDetailAddressChange?: (value: string) => void;
  errors?: {
    zipCode?: string;
    address?: string;
    detailAddress?: string;
  };
  labels?: {
    zipCode?: string;
    address?: string;
    detailAddress?: string;
  };
  placeholders?: {
    zipCode?: string;
    address?: string;
    detailAddress?: string;
  };
  required?: {
    zipCode?: boolean;
    address?: boolean;
    detailAddress?: boolean;
  };
}

/**
 * 카카오 Postcode API를 사용한 주소 검색 컴포넌트
 *
 * 회원가입, 프로필 수정, 주소지 관리 등에서 재사용 가능
 */
export default function AddressSearchInput({
  zipCode = "",
  address = "",
  detailAddress = "",
  onZipCodeChange,
  onAddressChange,
  onDetailAddressChange,
  errors,
  labels = {
    zipCode: "우편번호",
    address: "기본 주소",
    detailAddress: "상세 주소",
  },
  placeholders = {
    zipCode: "우편번호",
    address: "기본 주소",
    detailAddress: "상세 주소를 입력하세요",
  },
  required = {
    zipCode: false,
    address: true,
    detailAddress: false,
  },
}: AddressSearchInputProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSearchAddress = async () => {
    setIsLoading(true);

    try {
      // Postcode 스크립트 로드
      await loadPostcodeScript();

      new window.daum.Postcode({
        oncomplete: (data: DaumPostcodeData) => {
          // 우편번호
          if (onZipCodeChange) {
            onZipCodeChange(data.zonecode);
          }

          // 기본 주소
          if (onAddressChange) {
            onAddressChange(data.address);
          }

          // 상세 주소 입력란에 포커스
          const detailInput = document.querySelector(
            'input[placeholder*="상세"]'
          ) as HTMLInputElement;
          if (detailInput) {
            setTimeout(() => detailInput.focus(), 100);
          }

          setIsLoading(false);
        },
        onclose: () => {
          setIsLoading(false);
        },
      }).open();
    } catch (err) {
      console.error("Postcode error:", err);
      alert("주소 검색 기능을 불러올 수 없습니다.");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 우편번호 */}
      <div>
        <Label htmlFor="zipCode" className="flex items-center gap-1 mb-2">
          {labels.zipCode}
          {required.zipCode && <span className="text-red-500">*</span>}
        </Label>
        <div className="flex gap-2">
          <Input
            id="zipCode"
            type="text"
            value={zipCode}
            onChange={(e) => onZipCodeChange?.(e.target.value)}
            placeholder={placeholders.zipCode}
            readOnly
            className="flex-1"
          />
          <Button
            type="button"
            onClick={handleSearchAddress}
            disabled={isLoading}
            variant="outline"
            className="flex-shrink-0"
          >
            <Search className="w-4 h-4 mr-2" />
            {isLoading ? "검색 중..." : "우편번호 검색"}
          </Button>
        </div>
        {errors?.zipCode && (
          <p className="text-sm text-red-500 mt-1">{errors.zipCode}</p>
        )}
      </div>

      {/* 기본 주소 */}
      <div>
        <Label htmlFor="address" className="flex items-center gap-1 mb-2">
          {labels.address}
          {required.address && <span className="text-red-500">*</span>}
        </Label>
        <Input
          id="address"
          type="text"
          value={address}
          onChange={(e) => onAddressChange?.(e.target.value)}
          placeholder={placeholders.address}
          readOnly
        />
        {errors?.address && (
          <p className="text-sm text-red-500 mt-1">{errors.address}</p>
        )}
      </div>

      {/* 상세 주소 */}
      <div>
        <Label htmlFor="detailAddress" className="flex items-center gap-1 mb-2">
          {labels.detailAddress}
          {required.detailAddress && <span className="text-red-500">*</span>}
        </Label>
        <Input
          id="detailAddress"
          type="text"
          value={detailAddress}
          onChange={(e) => onDetailAddressChange?.(e.target.value)}
          placeholder={placeholders.detailAddress}
        />
        {errors?.detailAddress && (
          <p className="text-sm text-red-500 mt-1">{errors.detailAddress}</p>
        )}
      </div>
    </div>
  );
}

// Postcode 스크립트 로더 (전역 상태로 관리)
let postcodeScriptLoaded = false;

function loadPostcodeScript(): Promise<void> {
  if (postcodeScriptLoaded) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.onload = () => {
      postcodeScriptLoaded = true;
      resolve();
    };
    script.onerror = () => {
      reject(new Error("Postcode 스크립트 로드 실패"));
    };
    document.head.appendChild(script);
  });
}
