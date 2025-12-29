"use client";

import { useState, useEffect, type FormEvent, type ChangeEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PasswordInput } from "@/components/ui/password-input";
import { resetPasswordAction } from "@/actions/auth";
import { ResetPasswordRequestSchema } from "@/schemas/auth";
import { ZodError } from "zod";
import { toast } from "sonner";

interface FormData {
  password: string;
  passwordConfirm: string;
}

interface FormErrors {
  password?: string;
  passwordConfirm?: string;
  token?: string;
}

function ResetPasswordForm() {
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
    try {
      if (name === "password") {
        ResetPasswordRequestSchema.pick({ password: true }).parse({ password: value });
      } else if (name === "passwordConfirm") {
        if (value !== formData.password) {
          return "비밀번호가 일치하지 않습니다.";
        }
      }
      return undefined;
    } catch (err: unknown) {
      if (err instanceof ZodError && err.issues.length > 0) {
        return err.issues[0]?.message;
      }
      return "유효하지 않은 값입니다.";
    }
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

    setIsPending(true);
    setErrorMessage("");

    try {
      // Zod로 데이터 파싱 및 검증
      const validatedData = ResetPasswordRequestSchema.parse({
        token,
        password: formData.password,
      });

      // 비밀번호 재설정 서버 액션 호출
      const result = await resetPasswordAction(validatedData);

      if (result.success) {
        setIsSuccess(true);
        toast.success("비밀번호가 변경되었습니다. 로그인 페이지로 이동합니다.");
      } else {
        setErrorMessage(result.error || "비밀번호 재설정에 실패했습니다.");
        toast.error(result.error || "비밀번호 재설정에 실패했습니다.");
      }
    } catch (error) {
      console.error("Reset password error:", error);
      const message = error instanceof Error ? error.message : "오류가 발생했습니다.";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-page">
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
            <PasswordInput
              id="password"
              name="password"
              label="새 비밀번호"
              placeholder="최소 8자 이상"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.password ? formErrors.password : undefined}
              disabled={isPending}
              autoComplete="new-password"
            />

            {/* 비밀번호 확인 필드 */}
            <PasswordInput
              id="passwordConfirm"
              name="passwordConfirm"
              label="비밀번호 확인"
              placeholder="비밀번호를 다시 입력하세요"
              value={formData.passwordConfirm}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.passwordConfirm ? formErrors.passwordConfirm : undefined}
              disabled={isPending}
              autoComplete="new-password"
            />

            {/* 제출 버튼 */}
            <Button
              type="submit"
              variant="brand-gold"
              className="w-full h-12 font-semibold"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
