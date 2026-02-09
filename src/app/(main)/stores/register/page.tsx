"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { isWebView } from "@/lib/webview";
import { registerStoreAction } from "@/actions/stores";
import { getMeAction, updateProfileAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import KakaoAddressSearch from "@/components/kakao-address-search";
import { Store, Building2, Phone, Clock, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { StoreRegisterRequest } from "@/types/stores";
import { useSmartBack } from "@/hooks/useSmartBack";

export default function StoreRegisterPage() {
  const router = useRouter();
  const handleBack = useSmartBack('/stores');
  const { user, tokens, isAuthenticated, updateUser } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inWebView, setInWebView] = useState(false);

  useEffect(() => {
    setInWebView(isWebView());
  }, []);

  // 폼 데이터 상태
  const [formData, setFormData] = useState<StoreRegisterRequest>({
    // 사업자 정보
    business_number: "",
    business_start_date: "",
    representative_name: "",

    // 매장 기본 정보
    name: "",
    region: "",
    district: "",
    address: "",
    phone_number: "",

    // 위치 정보 (자동 입력)
    latitude: undefined,
    longitude: undefined,

    // 매장 상세 정보
    image_url: "",
    description: "",
    open_time: "",
    close_time: "",
    tag_ids: [],
  });

  // 입력 필드 변경 핸들러
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

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

  // 전화번호 포맷팅 (숫자와 하이픈만)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d-]/g, "");
    setFormData((prev) => ({
      ...prev,
      phone_number: value,
    }));
  };

  // 주소 검색 결과 처리
  const handleAddressSelect = (address: {
    address: string;
    sido: string;
    sigungu: string;
    latitude?: number;
    longitude?: number;
  }) => {
    setFormData((prev) => ({
      ...prev,
      address: address.address,
      region: address.sido,
      district: address.sigungu,
      latitude: address.latitude,
      longitude: address.longitude,
    }));
  };

  // 폼 유효성 검사
  const validateForm = (): boolean => {
    // 사업자 정보 검증
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

    // 매장 정보 검증
    if (!formData.name.trim()) {
      toast.error("매장명을 입력해주세요.");
      return false;
    }

    if (!formData.address.trim()) {
      toast.error("주소를 검색하여 선택해주세요.");
      return false;
    }

    if (!formData.phone_number.trim()) {
      toast.error("전화번호를 입력해주세요.");
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

    if (isSubmitting) return; // 중복 제출 방지

    setIsSubmitting(true);

    try {
      const result = await registerStoreAction(formData, tokens.access_token);

      if (result.success && result.data) {
        toast.success(result.data.message || "매장이 성공적으로 등록되었습니다!");

        // 닉네임을 매장명으로 업데이트
        if (formData.name && user) {
          const updateResult = await updateProfileAction(
            {
              name: user.name,
              nickname: formData.name, // 매장명을 닉네임으로 설정
              phone: user.phone,
              address: user.address,
            },
            tokens.access_token
          );

          if (!updateResult.success) {
            console.error("닉네임 업데이트 실패:", updateResult.error);
          }
        }

        // 유저 정보 새로고침 (admin 권한 및 닉네임 반영)
        const userResult = await getMeAction(tokens.access_token);
        if (userResult.success && userResult.data?.user) {
          updateUser(userResult.data.user);
        }

        // 등록 성공 시 내 매장 페이지로 이동
        router.push("/mystore");
      } else {
        toast.error(result.error || "매장 등록에 실패했습니다.");
      }
    } catch (error) {
      console.error("Store registration error:", error);
      toast.error("매장 등록 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 로그인 체크
  if (!isAuthenticated) {
    return (
      <div className={`max-w-2xl mx-auto px-4 ${inWebView ? "py-8" : "py-16"}`}>
        <Card className={`text-center ${inWebView ? "p-6" : "p-12"}`}>
          <AlertCircle className="w-16 h-16 text-[#C9A227] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            로그인이 필요합니다
          </h2>
          <p className="text-gray-600 mb-6">
            매장 등록을 위해 먼저 로그인해주세요.
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
      <div className={`max-w-2xl mx-auto px-4 ${inWebView ? "py-8" : "py-16"}`}>
        <Card className={`text-center ${inWebView ? "p-6" : "p-12"}`}>
          <Phone className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            휴대폰 인증이 필요합니다
          </h2>
          <p className="text-gray-600 mb-6">
            매장 등록을 위해서는 휴대폰 인증이 필요합니다.<br />
            마이페이지에서 휴대폰 인증을 완료해주세요.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => router.push("/")}>
              홈으로
            </Button>
            <Button onClick={() => router.push("/mypage/edit")}>
              휴대폰 인증하러 가기
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto px-4 ${inWebView ? "py-4" : "py-8"}`}>
      {/* 헤더 */}
      <div className={inWebView ? "mb-4" : "mb-8"}>
        <h1 className={`font-bold text-gray-900 mb-2 flex items-center gap-3 ${inWebView ? "text-2xl" : "text-3xl"}`}>
          <Store className={`text-[#C9A227] ${inWebView ? "w-6 h-6" : "w-8 h-8"}`} />
          매장 등록
        </h1>
        <p className={`text-gray-600 ${inWebView ? "text-xs" : "text-sm"}`}>
          사업자 정보 인증을 통해 매장을 등록하고 우동금 플랫폼에서 고객을 만나보세요.
        </p>
      </div>

      <form onSubmit={handleSubmit} className={inWebView ? "space-y-4" : "space-y-8"}>
        {/* 1. 사업자 정보 */}
        <Card className={inWebView ? "p-4" : "p-6"}>
          <div className={`flex items-center gap-2 ${inWebView ? "mb-4" : "mb-6"}`}>
            <Building2 className="w-5 h-5 text-blue-600" />
            <h2 className={`font-bold text-gray-900 ${inWebView ? "text-lg" : "text-xl"}`}>
              1. 사업자 정보 (필수)
            </h2>
          </div>
          <p className={`text-gray-600 bg-blue-50 rounded-lg border border-blue-200 ${inWebView ? "mb-4 p-3 text-[10px]" : "mb-6 p-4 text-sm"}`}>
            <CheckCircle2 className="w-4 h-4 inline mr-2 text-blue-600" />
            국세청 사업자등록번호 진위 확인을 통해 자동으로 인증됩니다.
          </p>

          <div className="space-y-4">
            {/* 사업자등록번호 */}
            <div>
              <Label htmlFor="business_number" className={inWebView ? "text-xs font-semibold" : "text-base font-semibold"}>
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
                className={`mt-2 ${inWebView ? "p-2.5 text-sm" : ""}`}
              />
              <p className={`mt-1 text-gray-500 ${inWebView ? "text-[10px]" : "text-sm"}`}>
                {formData.business_number.length}/10자
              </p>
            </div>

            {/* 개업일자 */}
            <div>
              <Label htmlFor="business_start_date" className={inWebView ? "text-xs font-semibold" : "text-base font-semibold"}>
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
                className={`mt-2 ${inWebView ? "p-2.5 text-sm" : ""}`}
              />
              <p className={`mt-1 text-gray-500 ${inWebView ? "text-[10px]" : "text-sm"}`}>
                {formData.business_start_date.length}/8자 (예: 20240315)
              </p>
            </div>

            {/* 대표자명 */}
            <div>
              <Label htmlFor="representative_name" className={inWebView ? "text-xs font-semibold" : "text-base font-semibold"}>
                대표자명 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="representative_name"
                name="representative_name"
                type="text"
                value={formData.representative_name}
                onChange={handleInputChange}
                placeholder="홍길동"
                required
                className={`mt-2 ${inWebView ? "p-2.5 text-sm" : ""}`}
              />
            </div>
          </div>
        </Card>

        {/* 2. 매장 기본 정보 */}
        <Card className={inWebView ? "p-4" : "p-6"}>
          <div className={`flex items-center gap-2 ${inWebView ? "mb-4" : "mb-6"}`}>
            <Store className="w-5 h-5 text-[#C9A227]" />
            <h2 className={`font-bold text-gray-900 ${inWebView ? "text-lg" : "text-xl"}`}>
              2. 매장 기본 정보 (필수)
            </h2>
          </div>

          <div className="space-y-4">
            {/* 매장명 */}
            <div>
              <Label htmlFor="name" className={inWebView ? "text-xs font-semibold" : "text-base font-semibold"}>
                매장명 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="우동금은방"
                required
                className={`mt-2 ${inWebView ? "p-2.5 text-sm" : ""}`}
              />
            </div>

            {/* 주소 검색 */}
            <div>
              <Label className={`mb-2 block ${inWebView ? "text-xs font-semibold" : "text-base font-semibold"}`}>
                매장 주소 <span className="text-red-500">*</span>
              </Label>
              <KakaoAddressSearch
                onSelect={handleAddressSelect}
                placeholder={formData.address || "주소를 검색하세요"}
                buttonText="주소 검색"
              />
              {formData.address && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className={`font-medium text-green-900 ${inWebView ? "text-xs" : "text-sm"}`}>
                    선택된 주소: {formData.address}
                  </p>
                  <p className={`text-green-700 mt-1 ${inWebView ? "text-[10px]" : "text-xs"}`}>
                    {formData.region} {formData.district}
                    {formData.latitude && formData.longitude && (
                      <span className="ml-2">
                        (위도: {formData.latitude.toFixed(6)}, 경도: {formData.longitude.toFixed(6)})
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* 전화번호 */}
            <div>
              <Label htmlFor="phone_number" className={inWebView ? "text-xs font-semibold" : "text-base font-semibold"}>
                전화번호 <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-2 mt-2">
                <Phone className="w-5 h-5 text-gray-400" />
                <Input
                  id="phone_number"
                  name="phone_number"
                  type="tel"
                  value={formData.phone_number}
                  onChange={handlePhoneChange}
                  placeholder="02-1234-5678 또는 010-1234-5678"
                  required
                  className={`flex-1 ${inWebView ? "p-2.5 text-sm" : ""}`}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* 3. 매장 상세 정보 (선택) */}
        <Card className={inWebView ? "p-4" : "p-6"}>
          <div className={`flex items-center gap-2 ${inWebView ? "mb-4" : "mb-6"}`}>
            <FileText className="w-5 h-5 text-purple-600" />
            <h2 className={`font-bold text-gray-900 ${inWebView ? "text-lg" : "text-xl"}`}>
              3. 매장 상세 정보 (선택)
            </h2>
          </div>

          <div className="space-y-4">
            {/* 영업 시간 */}
            <div className={`gap-4 ${inWebView ? "grid grid-cols-1" : "grid grid-cols-2"}`}>
              <div>
                <Label htmlFor="open_time" className={`flex items-center gap-2 ${inWebView ? "text-xs font-semibold" : "text-base font-semibold"}`}>
                  <Clock className="w-4 h-4" />
                  오픈 시간
                </Label>
                <Input
                  id="open_time"
                  name="open_time"
                  type="time"
                  value={formData.open_time}
                  onChange={handleInputChange}
                  className={`mt-2 ${inWebView ? "p-2.5 text-sm" : ""}`}
                />
              </div>

              <div>
                <Label htmlFor="close_time" className={`flex items-center gap-2 ${inWebView ? "text-xs font-semibold" : "text-base font-semibold"}`}>
                  <Clock className="w-4 h-4" />
                  마감 시간
                </Label>
                <Input
                  id="close_time"
                  name="close_time"
                  type="time"
                  value={formData.close_time}
                  onChange={handleInputChange}
                  className={`mt-2 ${inWebView ? "p-2.5 text-sm" : ""}`}
                />
              </div>
            </div>

            {/* 매장 소개 */}
            <div>
              <Label htmlFor="description" className={inWebView ? "text-xs font-semibold" : "text-base font-semibold"}>
                매장 소개
              </Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="매장을 소개하는 간단한 설명을 입력해주세요..."
                rows={4}
                className={`mt-2 ${inWebView ? "p-2.5 text-sm" : ""}`}
              />
              <p className={`text-gray-500 mt-1 ${inWebView ? "text-[10px]" : "text-sm"}`}>
                고객들에게 매장의 특징이나 강점을 알려주세요.
              </p>
            </div>
          </div>
        </Card>

        {/* 제출 버튼 */}
        <div className={`flex items-center justify-between border-t ${inWebView ? "pt-4" : "pt-6"}`}>
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={isSubmitting}
            className={inWebView ? "px-3 py-2 text-xs" : ""}
          >
            취소
          </Button>

          <Button
            type="submit"
            variant="brand-primary"
            disabled={isSubmitting}
            className={inWebView ? "px-3 py-2 text-xs" : "px-8"}
          >
            {isSubmitting ? (
              <>
                <div className={`border-2 border-white border-t-transparent rounded-full animate-spin mr-2 ${inWebView ? "w-3 h-3" : "w-4 h-4"}`} />
                등록 중...
              </>
            ) : (
              <>
                <CheckCircle2 className={`mr-2 ${inWebView ? "w-4 h-4" : "w-5 h-5"}`} />
                매장 등록하기
              </>
            )}
          </Button>
        </div>
      </form>

      {/* 안내 메시지 */}
      <Card className={`bg-gray-50 ${inWebView ? "mt-4 p-4" : "mt-8 p-6"}`}>
        <h3 className={`font-semibold text-gray-900 mb-3 ${inWebView ? "text-sm" : "text-base"}`}>📌 안내사항</h3>
        <ul className={`space-y-2 text-gray-700 ${inWebView ? "text-xs" : "text-sm"}`}>
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
              매장 등록 후 마이페이지에서 추가 정보를 수정할 수 있습니다.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#C9A227] mt-0.5">•</span>
            <span>
              주소 검색 시 자동으로 위도/경도가 설정되어 거리순 정렬에 활용됩니다.
            </span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
