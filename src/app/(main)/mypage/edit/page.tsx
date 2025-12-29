"use client";

import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { User as UserIcon, ArrowLeft, Save, Mail, Phone, MapPin, Camera } from "lucide-react";
import AddressSearchInput from "@/components/AddressSearchInput";
import { useAuthStore } from "@/stores/useAuthStore";
import { updateProfileAction } from "@/actions/auth";
import { getPresignedUrlAction, uploadToS3 } from "@/actions/upload";
import { UpdateProfileRequestSchema } from "@/schemas/auth";
import type { UpdateProfileRequest } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface FormErrors {
  name?: string;
  phone?: string;
}

export default function ProfileEditPage() {
  const router = useRouter();
  const { user, isAuthenticated, tokens, updateUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [formData, setFormData] = useState<UpdateProfileRequest>({
    name: user?.name || "",
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
      // 간단한 파싱: "[우편번호] 기본주소 상세주소" 형식 가정
      const match = user.address.match(/^\[(\d+)\]\s*(.+)$/);
      if (match) {
        setZipCode(match[1]);
        setBaseAddress(match[2]);
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
      const timer = setTimeout(() => {
        router.push("/mypage");
      }, 1500);
      return () => clearTimeout(timer);
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
    if (!file || !tokens?.access_token) return;

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
      const presignedResult = await getPresignedUrlAction(
        {
          filename: file.name,
          content_type: file.type,
          file_size: file.size,
          folder: "uploads",
        },
        tokens.access_token
      );

      if (!presignedResult.success || !presignedResult.data) {
        throw new Error(presignedResult.error || "Presigned URL 생성 실패");
      }

      const { upload_url, file_url } = presignedResult.data;

      // 2. S3에 파일 업로드
      const uploadResult = await uploadToS3(upload_url, file);

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "파일 업로드 실패");
      }

      // 3. 프로필 업데이트
      const updateResult = await updateProfileAction(
        {
          ...formData,
          profile_image: file_url,
        },
        tokens.access_token
      );

      if (!updateResult.success || !updateResult.data) {
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

    if (!tokens?.access_token) {
      toast.error("인증 토큰이 없습니다. 다시 로그인해주세요.");
      router.push("/login");
      return;
    }

    setIsPending(true);

    try {
      const result = await updateProfileAction(formData, tokens.access_token);

      if (result.success && result.data) {
        setIsSuccess(true);
        // Zustand 스토어의 사용자 정보 업데이트
        updateUser(result.data.user);
        toast.success("프로필이 성공적으로 업데이트되었습니다!");
      } else {
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
            className="gap-2 mb-4"
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
              <div className="relative group mb-4">
                <Avatar
                  className="w-32 h-32 border-4 border-gray-100 cursor-pointer transition-opacity hover:opacity-80"
                  onClick={handleProfileImageClick}
                >
                  {user?.profile_image ? (
                    <AvatarImage src={user.profile_image} alt={user.name} />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-white text-4xl">
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

                  {/* Phone */}
                  <div>
                    <Label htmlFor="phone" className="flex items-center gap-2 mb-2">
                      <Phone className="w-4 h-4" />
                      전화번호
                    </Label>
                    <Input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone || ""}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`h-12 ${
                        touched.phone && formErrors.phone ? "border-red-500" : ""
                      }`}
                      placeholder="010-1234-5678"
                      disabled={isPending}
                    />
                    {touched.phone && formErrors.phone && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.phone}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      형식: 010-1234-5678 또는 01012345678
                    </p>
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
                        detailAddress: "상세 주소 (선택)",
                      }}
                      placeholders={{
                        zipCode: "우편번호",
                        address: "주소 검색 버튼을 클릭하세요",
                        detailAddress: "동/호수, 건물명 등",
                      }}
                      required={{ address: false }}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      거주지 또는 사업장 주소를 입력하세요
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
                  className="gap-2 bg-gray-900 hover:bg-gray-800 text-white"
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span>저장 중...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>변경사항 저장</span>
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
