"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FormErrors {
  email?: string;
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState({
    email: "",
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  /**
   * 단일 필드 유효성 검사
   */
  const validateField = (name: string, value: string): string | undefined => {
    if (name === "email") {
      if (!value) {
        return "이메일을 입력해주세요.";
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return "올바른 이메일 형식이 아닙니다.";
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

    const emailError = validateField("email", formData.email);
    if (emailError) {
      errors.email = emailError;
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

    // 모든 필드를 터치 상태로 변경
    setTouched({
      email: true,
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
          <h2 className="text-2xl font-bold text-gray-900">비밀번호 찾기</h2>
        </div>

        {/* 성공 메시지 */}
        {isSuccess && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <Mail className="w-5 h-5 text-green-600" />
            <AlertDescription className="text-green-800 ml-2">
              이메일로 비밀번호 재설정 링크를 전송했습니다.
            </AlertDescription>
          </Alert>
        )}

        {/* 에러 메시지 */}
        {errorMessage && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <AlertDescription className="text-red-800">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        {!isSuccess && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <p className="text-sm text-gray-600">
              가입하신 이메일 주소를 입력하시면, 비밀번호 재설정 링크를
              보내드립니다.
            </p>

            {/* 이메일 필드 */}
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="user@example.com"
                className={
                  touched.email && formErrors.email
                    ? "border-red-500 focus-visible:ring-red-500"
                    : ""
                }
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isPending}
                autoComplete="email"
              />
              {touched.email && formErrors.email && (
                <p className="text-sm text-red-500">{formErrors.email}</p>
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
                  전송 중...
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5 mr-2" />
                  재설정 링크 전송
                </>
              )}
            </Button>
          </form>
        )}

        {/* 푸터 링크 */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center space-y-3">
            <Link
              href="/login"
              className="block text-sm text-[#FFD700] hover:text-[#FFC700] font-medium"
            >
              로그인 페이지로 돌아가기
            </Link>
            <div className="text-sm text-gray-600">
              계정이 없으신가요?{" "}
              <Link
                href="/signup"
                className="text-[#FFD700] hover:text-[#FFC700] font-medium"
              >
                회원가입
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
