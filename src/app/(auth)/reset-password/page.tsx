"use client";

import { useState, useEffect, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FormData {
  password: string;
  passwordConfirm: string;
}

interface FormErrors {
  password?: string;
  passwordConfirm?: string;
  token?: string;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState<FormData>({
    password: "",
    passwordConfirm: "",
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // 토큰 유효성 검사
  useEffect(() => {
    if (!token) {
      setFormErrors((prev) => ({
        ...prev,
        token: "유효하지 않은 재설정 링크입니다.",
      }));
    }
  }, [token]);

  // 성공 시 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        router.push("/login");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, router]);

  /**
   * 단일 필드 유효성 검사
   */
  const validateField = (name: string, value: string): string | undefined => {
    if (name === "password") {
      if (!value) {
        return "비밀번호를 입력해주세요.";
      }
      if (value.length < 8) {
        return "비밀번호는 최소 8자 이상이어야 합니다.";
      }
      // 영문, 숫자, 특수문자 포함 검사
      const hasLetter = /[a-zA-Z]/.test(value);
      const hasNumber = /[0-9]/.test(value);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);

      if (!hasLetter || !hasNumber || !hasSpecial) {
        return "영문, 숫자, 특수문자를 모두 포함해야 합니다.";
      }
    } else if (name === "passwordConfirm") {
      if (!value) {
        return "비밀번호 확인을 입력해주세요.";
      }
      if (value !== formData.password) {
        return "비밀번호가 일치하지 않습니다.";
      }
    }
    return undefined;
  };

  /**
   * 전체 폼 유효성 검사
   */
  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    let isValid = true;

    const passwordError = validateField("password", formData.password);
    if (passwordError) {
      errors.password = passwordError;
      isValid = false;
    }

    const passwordConfirmError = validateField(
      "passwordConfirm",
      formData.passwordConfirm
    );
    if (passwordConfirmError) {
      errors.passwordConfirm = passwordConfirmError;
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  /**
   * 입력값 변경 처리
   */
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // 이미 터치된 필드는 실시간 검증
    if (touched[name]) {
      const error = validateField(name, value);
      setFormErrors((prev) => ({
        ...prev,
        [name]: error,
      }));
    }
  };

  /**
   * 입력 필드 블러 처리
   */
  const handleBlur = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setTouched((prev) => ({ ...prev, [name]: true }));

    const error = validateField(name, value);
    setFormErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  /**
   * 폼 제출 처리
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // 토큰 유효성 확인
    if (!token) {
      return;
    }

    // 모든 필드를 터치 상태로 변경
    setTouched({
      password: true,
      passwordConfirm: true,
    });

    // 폼 유효성 검사
    if (!validateForm()) {
      return;
    }

    // API 호출 시뮬레이션 (실제 API 연동 시 수정)
    setIsPending(true);
    setErrorMessage("");

    try {
      // TODO: 실제 API 호출로 대체
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 성공 처리
      setIsSuccess(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "오류가 발생했습니다."
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => router.push("/login")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-2xl font-bold text-gray-900">비밀번호 재설정</h2>
        </div>

        {/* 성공 메시지 */}
        {isSuccess && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <Lock className="w-5 h-5 text-green-600" />
            <AlertDescription className="text-green-800 ml-2">
              <div className="font-semibold">비밀번호가 변경되었습니다.</div>
              <div className="text-sm mt-1">
                잠시 후 로그인 페이지로 이동합니다...
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* 토큰 에러 */}
        {formErrors.token && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <AlertDescription className="text-red-800">
              {formErrors.token}
            </AlertDescription>
          </Alert>
        )}

        {/* API 에러 */}
        {errorMessage && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <AlertDescription className="text-red-800">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        {!isSuccess && !formErrors.token && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <p className="text-sm text-gray-600">새로운 비밀번호를 입력하세요.</p>

            {/* 새 비밀번호 필드 */}
            <div className="space-y-2">
              <Label htmlFor="password">새 비밀번호</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="최소 8자 이상"
                  className={
                    touched.password && formErrors.password
                      ? "border-red-500 focus-visible:ring-red-500 pr-10"
                      : "pr-10"
                  }
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={isPending}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {touched.password && formErrors.password && (
                <p className="text-sm text-red-500">{formErrors.password}</p>
              )}
            </div>

            {/* 비밀번호 확인 필드 */}
            <div className="space-y-2">
              <Label htmlFor="passwordConfirm">비밀번호 확인</Label>
              <div className="relative">
                <Input
                  id="passwordConfirm"
                  name="passwordConfirm"
                  type={showPasswordConfirm ? "text" : "password"}
                  placeholder="비밀번호를 다시 입력하세요"
                  className={
                    touched.passwordConfirm && formErrors.passwordConfirm
                      ? "border-red-500 focus-visible:ring-red-500 pr-10"
                      : "pr-10"
                  }
                  value={formData.passwordConfirm}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={isPending}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPasswordConfirm ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {touched.passwordConfirm && formErrors.passwordConfirm && (
                <p className="text-sm text-red-500">
                  {formErrors.passwordConfirm}
                </p>
              )}
            </div>

            {/* 제출 버튼 */}
            <Button
              type="submit"
              className="w-full h-12 bg-[#FFD700] hover:bg-[#FFC700] text-gray-900 font-semibold"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-900 border-t-transparent"></span>
                  변경 중...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 mr-2" />
                  비밀번호 변경
                </>
              )}
            </Button>
          </form>
        )}

        {/* 푸터 링크 */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-[#FFD700] hover:text-[#FFC700] font-medium"
            >
              로그인 페이지로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
