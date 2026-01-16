"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { getStoreDetailAction, claimStoreAction } from "@/actions/stores";
import { getMeAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Store, Building2, MapPin, Phone, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { StoreDetail, ClaimStoreRequest } from "@/types/stores";

export default function StoreClaimPage() {
  const router = useRouter();
  const params = useParams();
  const storeId = params.storeId as string;
  const { user, tokens, isAuthenticated, updateUser } = useAuthStore();

  const [store, setStore] = useState<StoreDetail | null>(null);
  const [isLoadingStore, setIsLoadingStore] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 폼 데이터 상태
  const [formData, setFormData] = useState<ClaimStoreRequest>({
    business_number: "",
    business_start_date: "",
    representative_name: "",
  });

  // 매장 정보 로드
  useEffect(() => {
    const loadStore = async () => {
      setIsLoadingStore(true);
      try {
        const result = await getStoreDetailAction(parseInt(storeId));
        if (result.success && result.data) {
          setStore(result.data.store);

          // 이미 관리되는 매장인 경우
          if (result.data.store.is_managed) {
            toast.error("이미 등록된 매장입니다");
            router.push(`/stores/${storeId}/${result.data.store.slug}`);
          }
        } else {
          toast.error("매장 정보를 불러올 수 없습니다");
          router.push("/stores");
        }
      } catch (error) {
        console.error("Failed to load store:", error);
        toast.error("매장 정보를 불러오는 중 오류가 발생했습니다");
        router.push("/stores");
      } finally {
        setIsLoadingStore(false);
      }
    };

    if (storeId) {
      loadStore();
    }
  }, [storeId, router]);

  // 사업자등록번호 포맷팅 (숫자만 입력)
  const handleBusinessNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
    setFormData((prev) => ({
      ...prev,
      business_number: value,
    }));
  };

  // 개업일자 포맷팅 (YYYYMMDD)
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 8);
    setFormData((prev) => ({
      ...prev,
      business_start_date: value,
    }));
  };

  // 대표자명 입력
  const handleRepresentativeNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      representative_name: e.target.value,
    }));
  };

  // 폼 유효성 검사
  const validateForm = (): boolean => {
    if (formData.business_number.length !== 10) {
      toast.error("사업자등록번호는 10자리 숫자여야 합니다.");
      return false;
    }

    if (formData.business_start_date.length !== 8) {
      toast.error("개업일자는 YYYYMMDD 형식(8자리)이어야 합니다.");
      return false;
    }

    if (!formData.representative_name.trim()) {
      toast.error("대표자명을 입력해주세요.");
      return false;
    }

    return true;
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated || !tokens?.access_token) {
      toast.error("로그인이 필요합니다.");
      router.push("/login");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await claimStoreAction(
        parseInt(storeId),
        formData,
        tokens.access_token
      );

      if (result.success && result.data) {
        toast.success(result.data.message || "매장 소유권이 성공적으로 등록되었습니다!");

        // 유저 정보 새로고침 (admin 권한 반영)
        const userResult = await getMeAction(tokens.access_token);
        if (userResult.success && userResult.data?.user) {
          updateUser(userResult.data.user);
        }

        // 성공 시 내 매장 페이지로 이동
        setTimeout(() => {
          router.push("/mystore");
        }, 1000);
      } else {
        toast.error(result.error || "소유권 등록에 실패했습니다.");
      }
    } catch (error) {
      console.error("Store claim error:", error);
      toast.error("소유권 등록 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 로그인 체크
  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Card className="p-12 text-center">
          <AlertCircle className="w-16 h-16 text-[#C9A227] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            로그인이 필요합니다
          </h2>
          <p className="text-gray-600 mb-6">
            매장 소유권 등록을 위해 먼저 로그인해주세요.
          </p>
          <Button onClick={() => router.push("/login")}>
            로그인하기
          </Button>
        </Card>
      </div>
    );
  }

  // 휴대폰 인증 체크
  if (!user?.phone_verified) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Card className="p-12 text-center">
          <Phone className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            휴대폰 인증이 필요합니다
          </h2>
          <p className="text-gray-600 mb-6">
            매장 소유권 등록을 위해서는 휴대폰 인증이 필요합니다.<br />
            마이페이지에서 휴대폰 인증을 완료해주세요.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => router.push("/stores")}>
              매장 찾기
            </Button>
            <Button onClick={() => router.push("/mypage/edit")}>
              휴대폰 인증하러 가기
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // 매장 정보 로딩 중
  if (isLoadingStore) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500">매장 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 매장 정보 없음
  if (!store) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Card className="p-12 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            매장을 찾을 수 없습니다
          </h2>
          <p className="text-gray-600 mb-6">
            요청하신 매장 정보를 찾을 수 없습니다.
          </p>
          <Button onClick={() => router.push("/stores")}>
            매장 찾기
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">뒤로 가기</span>
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-[#C9A227]" />
          매장 소유권 등록
        </h1>
        <p className="text-gray-600">
          사업자 정보 인증을 통해 매장의 소유권을 등록하세요.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 매장 정보 확인 */}
        <Card className="p-6 bg-gradient-to-br from-[#FEF9E7] to-[#FAF4DC] border-2 border-[#C9A227]/30">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-[#C9A227] rounded-xl flex items-center justify-center flex-shrink-0">
              <Store className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                이 매장이 맞나요?
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                소유권을 등록하려는 매장 정보를 확인해주세요.
              </p>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Store className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-gray-900">{store.name}</span>
                    {store.branch_name && (
                      <span className="text-gray-600 ml-1">({store.branch_name})</span>
                    )}
                  </div>
                </div>

                {store.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{store.address}</span>
                  </div>
                )}

                {store.phone_number && (
                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{store.phone_number}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* 사업자 정보 입력 */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">
              사업자 정보 인증 (필수)
            </h2>
          </div>

          <p className="text-sm text-gray-600 mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <CheckCircle2 className="w-4 h-4 inline mr-2 text-blue-600" />
            국세청 사업자등록번호 진위 확인을 통해 자동으로 인증됩니다.
          </p>

          <div className="space-y-4">
            {/* 사업자등록번호 */}
            <div>
              <Label htmlFor="business_number" className="text-base font-semibold">
                사업자등록번호 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="business_number"
                name="business_number"
                type="text"
                value={formData.business_number}
                onChange={handleBusinessNumberChange}
                placeholder="1234567890 (10자리, 하이픈 제외)"
                maxLength={10}
                required
                className="mt-2"
              />
              <p className="text-sm text-gray-500 mt-1">
                {formData.business_number.length}/10자
              </p>
            </div>

            {/* 개업일자 */}
            <div>
              <Label htmlFor="business_start_date" className="text-base font-semibold">
                개업일자 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="business_start_date"
                name="business_start_date"
                type="text"
                value={formData.business_start_date}
                onChange={handleStartDateChange}
                placeholder="20240101 (YYYYMMDD 형식)"
                maxLength={8}
                required
                className="mt-2"
              />
              <p className="text-sm text-gray-500 mt-1">
                {formData.business_start_date.length}/8자 (예: 20240315)
              </p>
            </div>

            {/* 대표자명 */}
            <div>
              <Label htmlFor="representative_name" className="text-base font-semibold">
                대표자명 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="representative_name"
                name="representative_name"
                type="text"
                value={formData.representative_name}
                onChange={handleRepresentativeNameChange}
                placeholder="홍길동"
                required
                className="mt-2"
              />
            </div>
          </div>
        </Card>

        {/* 제출 버튼 */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            취소
          </Button>

          <Button
            type="submit"
            variant="brand-primary"
            disabled={isSubmitting}
            className="px-8"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                인증 중...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                소유권 등록하기
              </>
            )}
          </Button>
        </div>
      </form>

      {/* 안내 메시지 */}
      <Card className="mt-8 p-6 bg-gray-50">
        <h3 className="font-semibold text-gray-900 mb-3">📌 안내사항</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-[#C9A227] mt-0.5">•</span>
            <span>
              사업자 정보는 국세청 사업자등록번호 진위 확인 API를 통해 자동으로 검증됩니다.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#C9A227] mt-0.5">•</span>
            <span>
              사업자 인증이 완료되면 자동으로 매장 관리자 권한이 부여됩니다.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#C9A227] mt-0.5">•</span>
            <span>
              매장 소유권 등록 후 내 매장 페이지에서 매장 정보를 관리할 수 있습니다.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#C9A227] mt-0.5">•</span>
            <span>
              이미 다른 사용자가 등록한 매장은 소유권을 등록할 수 없습니다.
            </span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
