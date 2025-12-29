"use client";

import { useState, useEffect, type FormEvent, type ChangeEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuthStore } from "@/stores/useAuthStore";
import { loginUserAction } from "@/actions/auth";
import { LoginRequestSchema, type LoginRequest } from "@/schemas/auth";
import { ZodError } from "zod";
import { toast } from "sonner";

interface FormErrors {
  email?: string;
  password?: string;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, user, setAuth } = useAuthStore();

  const [formData, setFormData] = useState<LoginRequest>({
    email: "",
    password: "",
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // 인증된 사용자를 로그인 페이지에서 리다이렉트
  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectParam = searchParams?.get("redirect");
      if (redirectParam) {
        router.replace(redirectParam);
      } else {
        // 루트로 리다이렉트
        router.replace("/");
      }
    }
  }, [isAuthenticated, user, router, searchParams]);

  /**
   * 단일 필드 검증
   */
  const validateField = (name: string, value: string): string | undefined => {
    try {
      if (name === "email") {
        LoginRequestSchema.pick({ email: true }).parse({ email: value });
      } else if (name === "password") {
        LoginRequestSchema.pick({ password: true }).parse({ password: value });
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
   * 전체 폼 검증
   */
  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    let isValid = true;

    // 이메일 검증
    const emailError = validateField("email", formData.email);
    if (emailError) {
      errors.email = emailError;
      isValid = false;
    }

    // 비밀번호 검증
    const passwordError = validateField("password", formData.password);
    if (passwordError) {
      errors.password = passwordError;
      isValid = false;
    }

    setFormErrors(errors);
    setTouched({ email: true, password: true });

    return isValid;
  };

  /**
   * 입력 변경 처리
   */
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // 에러가 있으면 제거
    if (formErrors[name as keyof FormErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  /**
   * 입력 블러 처리 (필드를 터치된 것으로 표시)
   */
  const handleBlur = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    // 블러 시 필드 검증
    const error = validateField(name, value);
    if (error) {
      setFormErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  /**
   * 이메일 로그인 제출 처리
   */
  const handleEmailLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // 폼 검증
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Zod로 데이터 파싱 및 검증
      const validatedData = LoginRequestSchema.parse(formData);

      // 로그인 서버 액션 호출
      const result = await loginUserAction(validatedData);

      if (result.success && result.data) {
        // auth store에 사용자 정보와 토큰 업데이트
        setAuth(result.data.user, result.data.tokens);

        toast.success("로그인 성공!");

        // 리다이렉트 파라미터가 있으면 사용
        const redirectParam = searchParams?.get("redirect");
        if (redirectParam) {
          router.replace(redirectParam);
        } else {
          // 루트로 리다이렉트
          router.replace("/");
        }
      } else {
        toast.error(result.error || "로그인에 실패했습니다.");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("로그인 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    const clientId =
      provider === "카카오"
        ? process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID
        : provider === "Google"
        ? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
        : null;

    const redirectUri =
      provider === "카카오"
        ? process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI
        : provider === "Google"
        ? process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
        : null;

    if (!clientId || !redirectUri) {
      toast.error(`${provider} 로그인 설정이 완료되지 않았습니다.`);
      console.error(`Missing env variables for ${provider}`);
      return;
    }

    let authUrl = "";

    if (provider === "카카오") {
      // 카카오 OAuth 인증 URL
      authUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
    } else if (provider === "Google") {
      // 구글 OAuth 인증 URL
      const scope = encodeURIComponent("openid profile email");
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}`;
    } else {
      toast.info(`${provider} 로그인 준비 중입니다.`);
      return;
    }

    // OAuth 인증 페이지로 리다이렉트
    window.location.href = authUrl;
  };

  return (
    <div className="min-h-screen flex">
      {/* 좌측 - 브랜딩 영역 (데스크탑만) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 relative overflow-hidden">
        {/* 배경 패턴 */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>

        {/* 장식 요소 */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-40 right-20 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>

        {/* 컨텐츠 */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* 로고 */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
              </svg>
            </div>
            <span className="text-xl font-bold text-white">우리동네금은방</span>
          </Link>

          {/* 메인 카피 */}
          <div className="max-w-md">
            <h1 className="text-[40px] font-bold text-white leading-tight mb-6">
              투명한 금 거래,<br />
              쉽고 빠르게
            </h1>
            <p className="text-[17px] text-white/80 leading-relaxed">
              전국 금은방의 실시간 시세부터 상품까지<br />
              한 곳에서 비교하고 거래하세요
            </p>

            {/* 특징 리스트 */}
            <div className="mt-10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <span className="text-body text-white/90">실시간 금시세 확인</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"></path>
                  </svg>
                </div>
                <span className="text-body text-white/90">내 주변 금은방 찾기</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"></path>
                  </svg>
                </div>
                <span className="text-body text-white/90">신뢰할 수 있는 매장 정보</span>
              </div>
            </div>
          </div>

          {/* 하단 */}
          <p className="text-small text-white/50">
            © 2024 우리동네금은방. All rights reserved.
          </p>
        </div>
      </div>

      {/* 우측 - 로그인 폼 */}
      <div className="flex-1 flex flex-col">
        {/* 모바일 헤더 */}
        <header className="lg:hidden w-full bg-white border-b border-gray-100">
          <div className="px-page h-[60px] flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                </svg>
              </div>
              <span className="text-lg font-bold text-gray-900">우리동네금은방</span>
            </Link>
            <Link href="/" className="text-caption text-gray-500 hover:text-gray-900 smooth-transition">
              홈으로
            </Link>
          </div>
        </header>

        {/* 로그인 폼 컨테이너 */}
        <div className="flex-1 flex items-center justify-center px-page py-page bg-gray-50">
          <div className="w-full max-w-[400px]">
            {/* 타이틀 */}
            <div className="text-center mb-8">
              <h1 className="text-[26px] font-bold text-gray-900 mb-2">로그인</h1>
              <p className="text-body text-gray-500">우리동네금은방에 오신 것을 환영합니다</p>
            </div>

            {/* 소셜 로그인 */}
            <div className="space-y-3 mb-8">
              {/* 카카오 로그인 */}
              <Button
                type="button"
                onClick={() => handleSocialLogin("카카오")}
                variant="kakao"
                className="w-full py-6 h-auto"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.47 1.607 4.647 4.023 5.903-.176.657-.64 2.385-.733 2.758-.114.461.17.454.357.33.147-.097 2.343-1.595 3.293-2.243.349.05.706.076 1.06.076 5.523 0 10-3.477 10-7.824C20 6.477 17.523 3 12 3z"/>
                </svg>
                카카오로 시작하기
              </Button>

              {/* 구글 로그인 */}
              <Button
                type="button"
                onClick={() => handleSocialLogin("Google")}
                variant="outline"
                className="w-full flex items-center justify-center gap-3 py-6 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-body font-semibold smooth-transition h-auto"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google로 시작하기
              </Button>
            </div>

            {/* 구분선 */}
            <div className="relative flex items-center gap-4 mb-8">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-small text-gray-400">또는 이메일로 로그인</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            {/* 이메일 로그인 폼 */}
            <form className="space-y-4 mb-6" onSubmit={handleEmailLogin} noValidate>
              {/* 이메일 */}
              <div>
                <Label className="block text-small font-medium text-gray-700 mb-2">이메일</Label>
                <Input
                  type="email"
                  name="email"
                  placeholder="example@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  className={`w-full px-4 py-6 bg-gray-100 border-transparent focus:border-gray-900 focus:bg-white rounded-xl text-body placeholder-gray-400 smooth-transition ${
                    touched.email && formErrors.email
                      ? "border-red-400 focus:border-red-400"
                      : ""
                  }`}
                />
                {touched.email && formErrors.email && (
                  <p className="mt-2 text-sm text-red-400">{formErrors.email}</p>
                )}
              </div>

              {/* 비밀번호 */}
              <div>
                <PasswordInput
                  name="password"
                  label="비밀번호"
                  placeholder="비밀번호를 입력하세요"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.password ? formErrors.password : undefined}
                  required
                  className="w-full px-4 py-6 bg-gray-100 border-transparent focus:border-gray-900 focus:bg-white rounded-xl text-body placeholder-gray-400 smooth-transition"
                />
              </div>

              {/* 로그인 유지 & 비밀번호 찾기 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="rounded"
                  />
                  <Label htmlFor="remember" className="text-small text-gray-600 cursor-pointer">
                    로그인 유지
                  </Label>
                </div>
                <Link href="/forgot-password" className="text-small text-gray-500 hover:text-gray-900 smooth-transition">
                  비밀번호 찾기
                </Link>
              </div>

              {/* 로그인 버튼 */}
              <Button
                type="submit"
                disabled={isLoading}
                variant="brand-primary"
                className="w-full py-6 mt-6 h-auto"
              >
                {isLoading ? "로그인 중..." : "로그인"}
              </Button>
            </form>

            {/* 회원가입 링크 */}
            <p className="text-center text-caption text-gray-500">
              아직 회원이 아니신가요?
              <Link href="/signup" className="font-semibold text-gray-900 hover:underline ml-1">
                회원가입
              </Link>
            </p>

            {/* 하단 안내 */}
            <div className="mt-10 pt-8 border-t border-gray-100">
              <p className="text-[12px] text-gray-400 text-center leading-relaxed">
                로그인 시{" "}
                <Link href="#" className="underline hover:text-gray-600">
                  이용약관
                </Link>{" "}
                및{" "}
                <Link href="#" className="underline hover:text-gray-600">
                  개인정보처리방침
                </Link>
                에 동의하게 됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <LoginForm />
    </Suspense>
  );
}
