"use client";

import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User as UserIcon, ArrowLeft, Save, Mail, Phone, MapPin, Camera, CheckCircle2, Store as StoreIcon } from "lucide-react";
import AddressSearchInput from "@/components/AddressSearchInput";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAuthenticatedAction } from "@/hooks/useAuthenticatedAction";
import { updateProfileAction, sendPhoneVerificationAction, verifyPhoneAction, getMeAction } from "@/actions/auth";
import { getPresignedUrlAction, uploadToS3 } from "@/actions/upload";
import { UpdateProfileRequestSchema } from "@/schemas/auth";
import type { UpdateProfileRequest } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { getUserImageUrl } from "@/lib/utils";

interface FormErrors {
  name?: string;
  phone?: string;
}

export default function ProfileEditPage() {
  const router = useRouter();
  const { user, isAuthenticated, updateUser } = useAuthStore();
  const { withTokenRefresh } = useAuthenticatedAction();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // 휴대폰 인증 상태
  const [isPhoneVerificationSent, setIsPhoneVerificationSent] = useState(false);
  const [phoneVerificationCode, setPhoneVerificationCode] = useState("");
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);

  const [formData, setFormData] = useState<UpdateProfileRequest>({
    name: user?.name || "",
    nickname: user?.nickname || "",
    phone: user?.phone || "",
    address: user?.address || "",
  });

  // 주소 검색용 분리 필드
  const [zipCode, setZipCode] = useState("");
  const [baseAddress, setBaseAddress] = useState("");
  const [detailAddress, setDetailAddress] = useState("");

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // 로그인되지 않았으면 로그인 페이지로 이동
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // 기존 주소 파싱 (초기 로드 시)
  useEffect(() => {
    if (user?.address && !baseAddress && !zipCode && !detailAddress) {
      // 주소 형식: "[우편번호] 기본주소 상세주소"
      const match = user.address.match(/^\[(\d+)\]\s*(.+)$/);
      if (match) {
        const zipCodeStr = match[1];
        const restAddress = match[2].trim();

        // 기본주소와 상세주소를 분리
        // 일반적으로 시/도, 구/군, 동/읍/면 까지가 기본주소
        // 나머지가 상세주소로 추정
        const addressParts = restAddress.split(' ');

        // 최소 3개 이상의 부분이 있으면 마지막 부분을 상세주소로 간주
        if (addressParts.length >= 4) {
          // 예: "서울특별시 강남구 테헤란로 123" -> "서울특별시 강남구 테헤란로" + "123"
          const detailStartIdx = addressParts.findIndex((part, idx) =>
            idx >= 3 && /\d/.test(part) // 3번째 이후 숫자가 포함된 부분부터 상세주소
          );

          if (detailStartIdx > 0) {
            setZipCode(zipCodeStr);
            setBaseAddress(addressParts.slice(0, detailStartIdx).join(' '));
            setDetailAddress(addressParts.slice(detailStartIdx).join(' '));
          } else {
            // 분리 실패 시 전체를 기본주소로
            setZipCode(zipCodeStr);
            setBaseAddress(restAddress);
          }
        } else {
          // 부분이 적으면 전체를 기본주소로
          setZipCode(zipCodeStr);
          setBaseAddress(restAddress);
        }
      } else {
        // 우편번호 없이 주소만 있는 경우
        setBaseAddress(user.address);
      }
    }
  }, [user?.address]);

  // 주소 필드 합치기 (우편번호 + 기본주소 + 상세주소)
  useEffect(() => {
    const fullAddress = [
      zipCode && `[${zipCode}]`,
      baseAddress,
      detailAddress,
    ]
      .filter(Boolean)
      .join(" ");

    if (fullAddress !== formData.address) {
      setFormData((prev) => ({ ...prev, address: fullAddress }));
    }
  }, [zipCode, baseAddress, detailAddress]);

  // 성공 시 마이페이지로 이동
  useEffect(() => {
    if (isSuccess) {
      router.push("/mypage");
    }
  }, [isSuccess, router]);

  /**
   * 단일 필드 검증
   */
  const validateField = (name: string, value: string): string | undefined => {
    try {
      if (name === "name") {
        UpdateProfileRequestSchema.pick({ name: true }).parse({ name: value });
      } else if (name === "phone") {
        // 전화번호는 선택사항이므로 빈 값 허용
        if (value === "") return undefined;
        UpdateProfileRequestSchema.pick({ phone: true }).parse({ phone: value });
      }
      return undefined;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "issues" in err) {
        const issues = (err as { issues: Array<{ message: string }> }).issues;
        if (issues && issues.length > 0) {
          return issues[0].message;
        }
      }
      return "유효하지 않은 값입니다.";
    }
  };

  /**
   * 전체 폼 검증
   */
  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    let isValid = true;

    // 이름 검증
    const nameError = validateField("name", formData.name);
    if (nameError) {
      errors.name = nameError;
      isValid = false;
    }

    // 전화번호 검증 (입력된 경우에만)
    if (formData.phone) {
      const phoneError = validateField("phone", formData.phone);
      if (phoneError) {
        errors.phone = phoneError;
        isValid = false;
      }
    }

    setFormErrors(errors);
    return isValid;
  };

  /**
   * 입력값 변경 핸들러
   */
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // 사용자가 입력을 시작하면 에러 메시지 제거
    if (formErrors[name as keyof FormErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  /**
   * 포커스 아웃 핸들러 (터치 상태 및 검증)
   */
  const handleBlur = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    // 포커스 아웃 시 검증
    const error = validateField(name, value);
    if (error) {
      setFormErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  /**
   * 프로필 이미지 업로드 핸들러
   */
  const handleProfileImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("파일 크기는 5MB 이하여야 합니다.");
      return;
    }

    // 이미지 파일 타입 체크
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드 가능합니다.");
      return;
    }

    setIsUploadingImage(true);
    const loadingToast = toast.loading("프로필 이미지 업로드 중...");

    try {
      // 1. Presigned URL 가져오기
      const presignedResult = await withTokenRefresh((token) =>
        getPresignedUrlAction(
          {
            filename: file.name,
            content_type: file.type,
            file_size: file.size,
            folder: "uploads",
          },
          token
        )
      );

      if (!presignedResult.success || !presignedResult.data) {
        if (presignedResult.isUnauthorized) return; // 자동 로그아웃됨
        throw new Error(presignedResult.error || "Presigned URL 생성 실패");
      }

      const { upload_url, file_url } = presignedResult.data;

      // 2. S3에 파일 업로드
      const uploadResult = await uploadToS3(upload_url, file);

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "파일 업로드 실패");
      }

      // 3. 프로필 업데이트
      const updateResult = await withTokenRefresh((token) =>
        updateProfileAction(
          {
            ...formData,
            profile_image: file_url,
          },
          token
        )
      );

      if (!updateResult.success || !updateResult.data) {
        if (updateResult.isUnauthorized) return; // 자동 로그아웃됨
        throw new Error(updateResult.error || "프로필 업데이트 실패");
      }

      // 4. 상태 업데이트
      updateUser(updateResult.data.user);
      toast.success("프로필 이미지가 변경되었습니다.", { id: loadingToast });
    } catch (error) {
      console.error("Profile image upload error:", error);
      toast.error(error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.", {
        id: loadingToast,
      });
    } finally {
      setIsUploadingImage(false);
      // input 값 초기화 (같은 파일 재선택 가능하도록)
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  /**
   * 휴대폰 인증 코드 전송
   */
  const handleSendPhoneVerification = async () => {
    // 휴대폰 번호 유효성 검사
    if (!formData.phone || !/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(formData.phone)) {
      toast.error("올바른 휴대폰 번호를 입력해주세요.");
      return;
    }

    setIsVerifyingPhone(true);

    try {
      const result = await withTokenRefresh((token) =>
        sendPhoneVerificationAction({ phone: formData.phone! }, token)
      );

      if (result.success) {
        setIsPhoneVerificationSent(true);
        toast.success("인증 코드가 휴대폰으로 전송되었습니다.");
      } else {
        if (result.isUnauthorized) return; // 자동 로그아웃됨
        toast.error(result.error || "인증 코드 전송에 실패했습니다.");
      }
    } catch (error) {
      toast.error("인증 코드 전송 중 오류가 발생했습니다.");
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  /**
   * 휴대폰 인증 코드 확인
   */
  const handleVerifyPhone = async () => {
    if (!phoneVerificationCode || phoneVerificationCode.length !== 6) {
      toast.error("6자리 인증 코드를 입력해주세요.");
      return;
    }

    setIsVerifyingPhone(true);

    try {
      const result = await withTokenRefresh((token) =>
        verifyPhoneAction(
          {
            phone: formData.phone || "",
            code: phoneVerificationCode,
          },
          token
        )
      );

      if (result.success) {
        toast.success("휴대폰 인증이 완료되었습니다.");

        // 사용자 정보 새로고침 (phone_verified 상태 업데이트)
        const userResult = await withTokenRefresh((token) => getMeAction(token));
        if (userResult.success && userResult.data?.user) {
          updateUser(userResult.data.user);
        } else if (userResult.isUnauthorized) {
          return; // 자동 로그아웃됨
        }

        // 인증 성공 후 상태 초기화
        setIsPhoneVerificationSent(false);
        setPhoneVerificationCode("");
      } else {
        if (result.isUnauthorized) return; // 자동 로그아웃됨
        toast.error(result.error || "인증 코드가 올바르지 않습니다.");
      }
    } catch (error) {
      toast.error("인증 확인 중 오류가 발생했습니다.");
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  /**
   * 폼 제출 핸들러
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // 모든 필드를 터치 상태로 설정
    setTouched({ name: true, phone: true, address: true });

    // 폼 검증
    if (!validateForm()) {
      return;
    }

    setIsPending(true);

    try {
      // admin 사용자는 닉네임 수정 불가 (매장명과 동일해야 함)
      const updateData = user?.role === "admin"
        ? {
            name: formData.name,
            phone: formData.phone,
            address: formData.address,
          }
        : formData;

      const result = await withTokenRefresh((token) =>
        updateProfileAction(updateData, token)
      );

      if (result.success && result.data) {
        setIsSuccess(true);
        // Zustand 스토어의 사용자 정보 업데이트
        updateUser(result.data.user);
        toast.success("프로필이 성공적으로 업데이트되었습니다!");
      } else {
        if (result.isUnauthorized) return; // 자동 로그아웃됨
        toast.error(result.error || "프로필 업데이트에 실패했습니다.");
      }
    } catch (error) {
      console.error("Update profile error:", error);
      toast.error("프로필을 업데이트하는 중 오류가 발생했습니다.");
    } finally {
      setIsPending(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="flex-grow py-8 bg-gray-50">
      <section className="container mx-auto px-4 max-w-3xl">
        {/* Page Header */}
        <div className="mb-6">
          <Button
            onClick={() => router.push("/mypage")}
            variant="outline"
            size="sm"
            className="md:hidden gap-2 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            마이페이지로 돌아가기
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">프로필 수정</h1>
          <p className="mt-1 text-sm text-gray-600">회원 정보를 수정하세요</p>
        </div>

        {/* 프로필 이미지 카드 */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col items-center">
              {user?.role === "admin" ? (
                // 매장 관리자: 프로필 이미지 수정 불가, 매장 이미지 사용 안내
                <>
                  <div className="relative mb-4">
                    <Avatar className="w-32 h-32 border-4 border-gray-100">
                      {user?.store?.image_url ? (
                        <AvatarImage src={user.store.image_url} alt={user.store.name} />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-br from-[#C9A227] to-[#8A6A00] text-white text-4xl">
                        {user?.store?.name?.charAt(0) || user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="text-center max-w-md">
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-700 mb-2">
                      <StoreIcon className="w-4 h-4 text-[#8A6A00]" />
                      <span className="font-medium">매장 이미지가 프로필 이미지로 사용됩니다</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      매장 관리자는 별도 프로필 이미지를 설정할 수 없습니다
                    </p>
                    {user?.store?.id && user?.store?.slug && (
                      <Link href={`/stores/${user.store.id}/${user.store.slug}`}>
                        <Button variant="outline" size="sm" className="gap-2">
                          <StoreIcon className="w-4 h-4" />
                          매장 정보에서 이미지 수정하기
                        </Button>
                      </Link>
                    )}
                  </div>
                </>
              ) : (
                // 일반 사용자: 프로필 이미지 수정 가능
                <>
                  <div className="relative group mb-4">
                    <Avatar
                      className="w-32 h-32 border-4 border-gray-100 cursor-pointer transition-opacity hover:opacity-80"
                      onClick={handleProfileImageClick}
                    >
                      {user?.profile_image ? (
                        <AvatarImage src={user.profile_image} alt={user.name} />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-br from-[#C9A227] to-[#8A6A00] text-white text-4xl">
                        {user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {/* 카메라 아이콘 오버레이 */}
                    <div
                      className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={handleProfileImageClick}
                    >
                      {isUploadingImage ? (
                        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Camera className="w-10 h-10 text-white" />
                      )}
                    </div>
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfileImageChange}
                      disabled={isUploadingImage}
                    />
                  </div>
                  <p className="text-sm text-gray-600">프로필 이미지를 클릭하여 변경</p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG (최대 5MB)</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Form Card */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 이메일 (읽기 전용) */}
              <div>
                <Label htmlFor="email" className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4" />
                  이메일
                </Label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-sm text-gray-900 flex-1">{user?.email || "-"}</span>
                  <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">변경 불가</span>
                </div>
              </div>

              <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <Label htmlFor="name" className="flex items-center gap-2 mb-2">
                      <UserIcon className="w-4 h-4" />
                      이름 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`h-12 ${
                        touched.name && formErrors.name ? "border-red-500" : ""
                      }`}
                      placeholder="홍길동"
                      disabled={isPending}
                      required
                    />
                    {touched.name && formErrors.name && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>
                    )}
                  </div>

                  {/* Nickname */}
                  <div>
                    <Label htmlFor="nickname" className="flex items-center gap-2 mb-2">
                      <UserIcon className="w-4 h-4" />
                      닉네임
                    </Label>
                    <Input
                      type="text"
                      id="nickname"
                      name="nickname"
                      value={formData.nickname || ""}
                      onChange={handleChange}
                      className="h-12"
                      placeholder="닉네임을 입력하세요"
                      disabled={isPending || user?.role === "admin"}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {user?.role === "admin"
                        ? "매장 주인은 닉네임을 수정할 수 없습니다 (매장명과 동일)"
                        : "입력하지 않으면 자동으로 생성됩니다"}
                    </p>
                  </div>

                  {/* Phone */}
                  <div>
                    <Label htmlFor="phone" className="flex items-center gap-2 mb-2">
                      <Phone className="w-4 h-4" />
                      전화번호
                      {user?.phone_verified && (
                        <span className="flex items-center gap-1 text-xs text-green-600 font-normal">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          인증완료
                        </span>
                      )}
                    </Label>

                    {/* 전화번호 입력 및 인증 요청 */}
                    <div className="flex gap-2">
                      <Input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone || ""}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`h-12 ${
                          touched.phone && formErrors.phone ? "border-red-500" : ""
                        } ${user?.phone_verified ? "bg-green-50 border-green-200" : ""}`}
                        placeholder="010-1234-5678"
                        disabled={isPending || user?.phone_verified}
                      />
                      {!user?.phone_verified && (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={isPending || isVerifyingPhone || !formData.phone || isPhoneVerificationSent}
                          onClick={handleSendPhoneVerification}
                          className="px-4 h-12 whitespace-nowrap"
                        >
                          {isPhoneVerificationSent ? "전송완료" : "인증요청"}
                        </Button>
                      )}
                    </div>

                    {/* 인증 코드 입력 필드 (인증 코드 전송 후 표시) */}
                    {isPhoneVerificationSent && !user?.phone_verified && (
                      <div className="flex gap-2 mt-3">
                        <Input
                          type="text"
                          placeholder="6자리 인증 코드"
                          value={phoneVerificationCode}
                          onChange={(e) => setPhoneVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          disabled={isVerifyingPhone}
                          maxLength={6}
                          className="h-12"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={isVerifyingPhone || phoneVerificationCode.length !== 6}
                          onClick={handleVerifyPhone}
                          className="px-4 h-12 whitespace-nowrap"
                        >
                          {isVerifyingPhone ? "확인 중..." : "인증확인"}
                        </Button>
                      </div>
                    )}

                    {touched.phone && formErrors.phone && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.phone}</p>
                    )}
                    {!user?.phone_verified && !isPhoneVerificationSent && (
                      <p className="text-xs text-gray-500 mt-1">
                        형식: 010-1234-5678 또는 01012345678<br />
                        매장 등록 시 휴대폰 인증이 필요합니다
                      </p>
                    )}
                    {isPhoneVerificationSent && !user?.phone_verified && (
                      <p className="text-xs text-gray-500 mt-1">
                        휴대폰으로 전송된 6자리 인증 코드를 입력해주세요
                      </p>
                    )}
                    {user?.phone_verified && (
                      <p className="text-xs text-green-600 mt-1 flex items-center">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        휴대폰 인증이 완료되었습니다
                      </p>
                    )}
                  </div>

                  {/* Address */}
                  <div>
                    <Label className="flex items-center gap-2 mb-4">
                      <MapPin className="w-4 h-4" />
                      주소지
                    </Label>
                    <AddressSearchInput
                      zipCode={zipCode}
                      address={baseAddress}
                      detailAddress={detailAddress}
                      onZipCodeChange={setZipCode}
                      onAddressChange={setBaseAddress}
                      onDetailAddressChange={setDetailAddress}
                      labels={{
                        zipCode: "우편번호 (선택)",
                        address: "기본 주소",
                        detailAddress: "상세 주소",
                      }}
                      placeholders={{
                        zipCode: "우편번호",
                        address: "주소 검색 버튼을 클릭하세요",
                        detailAddress: "동/호수, 건물명 등을 입력하세요",
                      }}
                      required={{ address: false, detailAddress: true }}
                      errors={{
                        detailAddress: touched.address && baseAddress && !detailAddress
                          ? "상세 주소를 입력해주세요"
                          : undefined
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      거주지 또는 사업장 주소를 입력하세요<br />
                      {baseAddress && !detailAddress && (
                        <span className="text-red-500 font-medium">
                          ⚠ 상세 주소를 반드시 입력해야 저장할 수 있습니다
                        </span>
                      )}
                    </p>
                  </div>
                </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button
                  type="button"
                  onClick={() => router.push("/mypage")}
                  variant="outline"
                  disabled={isPending}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  variant="brand-primary"
                  className="gap-2"
                  disabled={isPending || (!!baseAddress && !detailAddress)}
                >
                  {isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span>저장 중...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>저장</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
