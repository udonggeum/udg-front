"use client";

import { useState, useEffect, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { User as UserIcon, ArrowLeft, Save, Lock, Edit3, Shield, Mail, Phone, Key, MapPin } from "lucide-react";
import AddressSearchInput from "@/components/AddressSearchInput";
import { useAuthStore } from "@/stores/useAuthStore";
import { updateProfileAction } from "@/actions/auth";
import { UpdateProfileRequestSchema } from "@/schemas/auth";
import type { UpdateProfileRequest } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface FormErrors {
  name?: string;
  phone?: string;
}

export default function ProfileEditPage() {
  const router = useRouter();
  const { user, isAuthenticated, tokens, updateUser } = useAuthStore();
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

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
    <main className="flex-grow py-8">
      <section className="container mx-auto px-4 max-w-3xl">
        {/* Page Header */}
        <div className="mb-8">
          <Button
            onClick={() => router.push("/mypage")}
            variant="outline"
            size="sm"
            className="gap-2 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            마이페이지로 돌아가기
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">프로필 수정</h1>
          <p className="mt-2 text-gray-600">회원 정보를 수정하세요</p>
        </div>

        {/* Form Card */}
        <Card className="border-2 border-gray-200">
          <CardContent className="pt-6">
            {/* Success Message */}
            {isSuccess && (
              <Alert className="mb-6 border-green-500 bg-green-50">
                <AlertTitle className="text-green-800">성공!</AlertTitle>
                <AlertDescription className="text-green-700">
                  프로필이 성공적으로 업데이트되었습니다!
                </AlertDescription>
              </Alert>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* 계정 정보 (변경 불가) */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-bold text-gray-900">계정 정보</h3>
                  <Badge variant="secondary" className="text-xs">
                    변경 불가
                  </Badge>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-500" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 mb-1">이메일</p>
                      <p className="text-sm font-semibold text-gray-900">{user?.email || "-"}</p>
                    </div>
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500 mt-3 ml-8">
                    이메일은 계정 식별에 사용되어 변경할 수 없습니다
                  </p>
                </div>
              </div>

              {/* 개인 정보 */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Edit3 className="w-5 h-5 text-gray-900" />
                  <h3 className="text-lg font-bold text-gray-900">개인 정보</h3>
                  <Badge className="text-xs bg-gray-900">수정 가능</Badge>
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
              </div>

              {/* 보안 설정 */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-bold text-gray-900">보안 설정</h3>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Key className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">비밀번호</p>
                        <p className="text-xs text-gray-600 mt-1">
                          계정 보안을 위해 정기적으로 변경하세요
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // TODO: 비밀번호 변경 페이지로 이동
                        toast.info("비밀번호 변경 기능은 곧 제공될 예정입니다");
                      }}
                    >
                      변경하기
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-2">
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
                  className="gap-2 bg-gray-900 hover:bg-gray-800"
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
