"use client";

import { useState, useEffect, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUIStore } from "@/stores/useUIStore";
import { registerUserAction } from "@/actions/auth";

interface FormErrors {
  email?: string;
  password?: string;
  passwordConfirm?: string;
  name?: string;
  phone?: string;
}

export default function SignupPage() {
  const router = useRouter();
  const { isAuthenticated, setAuth } = useAuthStore();
  const { showToast } = useUIStore();

  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // 이미 로그인된 경우 메인 페이지로 리다이렉트
  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, router]);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    passwordConfirm: "",
    name: "",
    phone: "",
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [allAgreed, setAllAgreed] = useState(false);
  const [agreements, setAgreements] = useState({
    terms: false,
    privacy: false,
    location: false,
    marketing: false,
  });
  const [marketingChannels, setMarketingChannels] = useState({
    sms: false,
    email: false,
    push: false,
  });

  /**
   * 비밀번호 강도 계산
   */
  const getPasswordStrength = (password: string): number => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    return Math.min(strength, 4);
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const passwordStrengthText =
    passwordStrength === 0
      ? "입력해주세요"
      : passwordStrength === 1
      ? "매우 약함"
      : passwordStrength === 2
      ? "약함"
      : passwordStrength === 3
      ? "보통"
      : "강함";

  /**
   * 폼 제출 가능 여부 확인
   */
  const isFormValid = (): boolean => {
    // 필수 필드 입력 확인
    if (!formData.email || !formData.password || !formData.passwordConfirm || !formData.name || !formData.phone) {
      return false;
    }

    // 이메일 형식 확인
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return false;
    }

    // 비밀번호 조건 확인
    if (formData.password.length < 8 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      return false;
    }

    // 비밀번호 일치 확인
    if (formData.password !== formData.passwordConfirm) {
      return false;
    }

    // 휴대폰 번호 형식 확인
    if (!/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(formData.phone)) {
      return false;
    }

    // 필수 약관 동의 확인 (이용약관, 개인정보처리방침, 위치기반서비스)
    if (!agreements.terms || !agreements.privacy || !agreements.location) {
      return false;
    }

    // 현재 에러가 있는지 확인
    if (Object.keys(formErrors).some(key => formErrors[key as keyof FormErrors])) {
      return false;
    }

    return true;
  };

  /**
   * 단일 필드 유효성 검사
   */
  const validateField = (field: keyof FormErrors): boolean => {
    const errors: FormErrors = {};

    switch (field) {
      case "email":
        if (!formData.email) {
          errors.email = "이메일을 입력해주세요.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          errors.email = "올바른 이메일 형식이 아닙니다.";
        }
        break;

      case "password":
        if (!formData.password) {
          errors.password = "비밀번호를 입력해주세요.";
        } else if (formData.password.length < 8) {
          errors.password = "비밀번호는 최소 8자 이상이어야 합니다.";
        } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
          errors.password = "영문 대소문자, 숫자를 모두 포함해야 합니다.";
        }
        break;

      case "passwordConfirm":
        if (!formData.passwordConfirm) {
          errors.passwordConfirm = "비밀번호 확인을 입력해주세요.";
        } else if (formData.password !== formData.passwordConfirm) {
          errors.passwordConfirm = "비밀번호가 일치하지 않습니다.";
        }
        break;

      case "name":
        if (!formData.name || formData.name.trim().length === 0) {
          errors.name = "이름을 입력해주세요.";
        }
        break;

      case "phone":
        if (!formData.phone) {
          errors.phone = "휴대폰 번호를 입력해주세요.";
        } else if (!/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(formData.phone)) {
          errors.phone = "올바른 휴대폰 번호 형식이 아닙니다.";
        }
        break;
    }

    setFormErrors((prev) => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  };

  /**
   * 전체 폼 유효성 검사
   */
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    // 이메일 검증
    if (!formData.email) {
      errors.email = "이메일을 입력해주세요.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "올바른 이메일 형식이 아닙니다.";
    }

    // 비밀번호 검증
    if (!formData.password) {
      errors.password = "비밀번호를 입력해주세요.";
    } else if (formData.password.length < 8) {
      errors.password = "비밀번호는 최소 8자 이상이어야 합니다.";
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = "영문 대소문자, 숫자를 모두 포함해야 합니다.";
    }

    // 비밀번호 확인 검증
    if (!formData.passwordConfirm) {
      errors.passwordConfirm = "비밀번호 확인을 입력해주세요.";
    } else if (formData.password !== formData.passwordConfirm) {
      errors.passwordConfirm = "비밀번호가 일치하지 않습니다.";
    }

    // 이름 검증
    if (!formData.name || formData.name.trim().length === 0) {
      errors.name = "이름을 입력해주세요.";
    }

    // 휴대폰 번호 검증
    if (!formData.phone) {
      errors.phone = "휴대폰 번호를 입력해주세요.";
    } else if (!/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(formData.phone)) {
      errors.phone = "올바른 휴대폰 번호 형식이 아닙니다.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * 입력값 변경 처리
   */
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // 이미 터치된 필드는 실시간 검증
    if (touched[name]) {
      validateField(name as keyof FormErrors);
    }

    // 에러 메시지 초기화
    if (formErrors[name as keyof FormErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  /**
   * 입력 필드 블러 처리
   */
  const handleBlur = (field: keyof FormErrors) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field);
  };

  /**
   * 소셜 회원가입
   */
  const handleSocialSignup = async (provider: string) => {
    // TODO: 실제 소셜 로그인 API 연동
    try {
      // 시뮬레이션: 소셜 로그인 성공 후 받은 데이터
      const mockUser = {
        id: 1,
        email: `${provider.toLowerCase()}@example.com`,
        name: `${provider} 사용자`,
        role: "user" as const,
      };

      const mockTokens = {
        access_token: "mock_access_token",
        refresh_token: "mock_refresh_token",
      };

      // Zustand 스토어에 저장 (자동으로 localStorage에도 저장됨)
      setAuth(mockUser, mockTokens);

      // 성공 토스트 표시
      showToast({
        message: `${provider} 로그인에 성공했습니다!`,
        type: "success",
        duration: 3000,
      });

      // 메인 페이지로 이동
      router.push("/");
    } catch (error) {
      showToast({
        message: "소셜 로그인에 실패했습니다.",
        type: "error",
        duration: 3000,
      });
    }
  };

  /**
   * 전체 동의 처리
   */
  const handleAllAgreed = (checked: boolean) => {
    setAllAgreed(checked);
    setAgreements({
      terms: checked,
      privacy: checked,
      location: checked,
      marketing: checked,
    });
    if (checked) {
      setMarketingChannels({
        sms: true,
        email: true,
        push: true,
      });
    }
  };

  /**
   * 폼 제출 처리
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // 모든 필드를 터치 상태로 변경
    setTouched({
      email: true,
      password: true,
      passwordConfirm: true,
      name: true,
      phone: true,
    });

    // 폼 유효성 검사
    if (!validateForm()) {
      return;
    }

    // 필수 약관 동의 확인
    if (!agreements.terms || !agreements.privacy || !agreements.location) {
      setErrorMessage("필수 약관에 동의해주세요.");
      return;
    }

    // API 호출
    setIsPending(true);
    setErrorMessage("");

    try {
      // 회원가입 데이터 준비 (passwordConfirm 제외)
      const { passwordConfirm, ...registerData } = formData;

      // Server Action 호출 (서버 사이드에서 실행되므로 CORS 문제 없음)
      const result = await registerUserAction(registerData);

      if (!result.success) {
        // 에러 처리
        setErrorMessage(result.error || "회원가입에 실패했습니다.");
        showToast({
          message: result.error || "회원가입에 실패했습니다.",
          type: "error",
          duration: 3000,
        });
        return;
      }

      // 성공 토스트 표시
      showToast({
        message: "회원 가입이 완료되었습니다",
        type: "success",
        duration: 3000,
      });

      // 약관 동의 정보 로깅 (필요시 서버에 별도 저장)
      console.log("약관 동의 정보:", {
        agreements,
        marketingChannels,
      });

      // 로그인 페이지로 이동
      router.push("/login");
    } catch (error) {
      // 예상치 못한 에러 처리
      const errorMessage = error instanceof Error ? error.message : "회원가입 중 오류가 발생했습니다.";

      setErrorMessage(errorMessage);
      showToast({
        message: errorMessage,
        type: "error",
        duration: 3000,
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* 헤더 */}
      <header className="w-full bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-[520px] mx-auto px-page h-[60px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900">우리동네금은방</span>
          </Link>
          <Link href="/login" className="text-caption text-gray-500 hover:text-gray-900 smooth-transition">
            로그인
          </Link>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 flex flex-col">
        <div className="max-w-[520px] w-full mx-auto px-page py-10">
          {/* 스텝 인디케이터 */}
          <div className="flex items-center justify-center gap-4 mb-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center text-small font-semibold">
                1
              </div>
              <span className="text-small font-medium text-gray-900 hidden sm:block">정보입력</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-200"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-small font-semibold text-gray-500">
                2
              </div>
              <span className="text-small font-medium text-gray-400 hidden sm:block">약관동의</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-200"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-small font-semibold text-gray-500">
                3
              </div>
              <span className="text-small font-medium text-gray-400 hidden sm:block">가입완료</span>
            </div>
          </div>

          {/* 타이틀 */}
          <div className="text-center mb-10">
            <h1 className="text-[26px] font-bold text-gray-900 mb-2">회원가입</h1>
            <p className="text-body text-gray-500">간편하게 가입하고 다양한 서비스를 이용하세요</p>
          </div>

          {/* 에러 메시지 */}
          {errorMessage && (
            <Alert className="mb-6 bg-red-50 border-red-200">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <AlertDescription className="text-red-800 ml-2">
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* 소셜 회원가입 */}
          <div className="space-y-3 mb-8">
            {/* 카카오 */}
            <Button
              type="button"
              onClick={() => handleSocialSignup("카카오")}
              disabled={isPending}
              variant="kakao"
              className="w-full py-6 h-auto"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.47 1.607 4.647 4.023 5.903-.176.657-.64 2.385-.733 2.758-.114.461.17.454.357.33.147-.097 2.343-1.595 3.293-2.243.349.05.706.076 1.06.076 5.523 0 10-3.477 10-7.824C20 6.477 17.523 3 12 3z"/>
              </svg>
              카카오로 3초만에 시작하기
            </Button>

            {/* 네이버 */}
            <Button
              type="button"
              onClick={() => handleSocialSignup("네이버")}
              disabled={isPending}
              variant="naver"
              className="w-full py-6 h-auto"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.273 12.845L7.376 3H3v18h4.726V12.155L16.624 21H21V3h-4.727z"/>
              </svg>
              네이버로 시작하기
            </Button>
          </div>

          {/* 구분선 */}
          <div className="relative flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-small text-gray-400">또는 이메일로 가입</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {/* 회원가입 폼 */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* 이메일 */}
            <div>
              <Label className="block text-small font-semibold text-gray-900 mb-2">
                이메일 <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="email"
                    name="email"
                    placeholder="example@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={() => handleBlur("email")}
                    disabled={isPending}
                    className={`px-4 py-6 bg-gray-100 border-transparent focus:border-gray-900 focus:bg-white rounded-xl text-body placeholder-gray-400 smooth-transition ${
                      touched.email && formErrors.email ? "border-red-500 focus:border-red-500" : ""
                    }`}
                  />
                  {touched.email && formErrors.email && (
                    <p className="mt-1.5 text-[12px] text-red-500">{formErrors.email}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isPending}
                  className="px-5 py-6 bg-gray-200 hover:bg-gray-300 text-gray-700 text-caption font-semibold rounded-xl whitespace-nowrap"
                >
                  인증요청
                </Button>
              </div>
              {!(touched.email && formErrors.email) && (
                <p className="mt-2 text-[12px] text-gray-500">로그인 및 주요 알림에 사용됩니다</p>
              )}
            </div>

            {/* 비밀번호 */}
            <div>
              <Label className="block text-small font-semibold text-gray-900 mb-2">
                비밀번호 <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="8자 이상, 영문/숫자/특수문자 조합"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={() => handleBlur("password")}
                  disabled={isPending}
                  className={`w-full px-4 py-6 bg-gray-100 border-transparent focus:border-gray-900 focus:bg-white rounded-xl text-body placeholder-gray-400 smooth-transition pr-12 ${
                    touched.password && formErrors.password ? "border-red-500 focus:border-red-500" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 smooth-transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {touched.password && formErrors.password ? (
                <p className="mt-2 text-[12px] text-red-500">{formErrors.password}</p>
              ) : (
                <>
                  {/* 비밀번호 강도 표시 */}
                  <div className="flex gap-1 mt-3">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full ${
                          level <= passwordStrength
                            ? passwordStrength <= 2
                              ? "bg-red-400"
                              : passwordStrength === 3
                              ? "bg-yellow-400"
                              : "bg-green-400"
                            : "bg-gray-200"
                        }`}
                      ></div>
                    ))}
                  </div>
                  <p className="text-[12px] text-gray-400 mt-2">
                    비밀번호 강도:{" "}
                    <span
                      className={
                        passwordStrength === 0
                          ? "text-gray-500"
                          : passwordStrength <= 2
                          ? "text-red-500"
                          : passwordStrength === 3
                          ? "text-yellow-600"
                          : "text-green-600"
                      }
                    >
                      {passwordStrengthText}
                    </span>
                  </p>
                </>
              )}
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <Label className="block text-small font-semibold text-gray-900 mb-2">
                비밀번호 확인 <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showPasswordConfirm ? "text" : "password"}
                  name="passwordConfirm"
                  placeholder="비밀번호를 한번 더 입력하세요"
                  value={formData.passwordConfirm}
                  onChange={handleChange}
                  onBlur={() => handleBlur("passwordConfirm")}
                  disabled={isPending}
                  className={`w-full px-4 py-6 bg-gray-100 border-transparent focus:border-gray-900 focus:bg-white rounded-xl text-body placeholder-gray-400 smooth-transition pr-12 ${
                    touched.passwordConfirm && formErrors.passwordConfirm
                      ? "border-red-500 focus:border-red-500"
                      : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 smooth-transition"
                >
                  {showPasswordConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {touched.passwordConfirm && formErrors.passwordConfirm && (
                <p className="mt-2 text-[12px] text-red-500">{formErrors.passwordConfirm}</p>
              )}
            </div>

            {/* 이름 */}
            <div>
              <Label className="block text-small font-semibold text-gray-900 mb-2">
                이름 <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                name="name"
                placeholder="실명을 입력하세요"
                value={formData.name}
                onChange={handleChange}
                onBlur={() => handleBlur("name")}
                disabled={isPending}
                className={`w-full px-4 py-6 bg-gray-100 border-transparent focus:border-gray-900 focus:bg-white rounded-xl text-body placeholder-gray-400 smooth-transition ${
                  touched.name && formErrors.name ? "border-red-500 focus:border-red-500" : ""
                }`}
              />
              {touched.name && formErrors.name && (
                <p className="mt-2 text-[12px] text-red-500">{formErrors.name}</p>
              )}
            </div>

            {/* 휴대폰 번호 */}
            <div>
              <Label className="block text-small font-semibold text-gray-900 mb-2">
                휴대폰 번호 <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="tel"
                    name="phone"
                    placeholder="'-' 없이 숫자만 입력"
                    value={formData.phone}
                    onChange={handleChange}
                    onBlur={() => handleBlur("phone")}
                    disabled={isPending}
                    className={`px-4 py-6 bg-gray-100 border-transparent focus:border-gray-900 focus:bg-white rounded-xl text-body placeholder-gray-400 smooth-transition ${
                      touched.phone && formErrors.phone ? "border-red-500 focus:border-red-500" : ""
                    }`}
                  />
                  {touched.phone && formErrors.phone && (
                    <p className="mt-1.5 text-[12px] text-red-500">{formErrors.phone}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isPending}
                  className="px-5 py-6 bg-gray-200 hover:bg-gray-300 text-gray-700 text-caption font-semibold rounded-xl whitespace-nowrap"
                >
                  인증요청
                </Button>
              </div>
            </div>

            {/* 구분선 */}
            <Separator className="my-8" />

            {/* 약관 동의 */}
            <div className="space-y-4">
              <h3 className="text-body font-semibold text-gray-900">약관 동의</h3>

              {/* 전체 동의 */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <Checkbox
                  id="all"
                  checked={allAgreed}
                  onCheckedChange={handleAllAgreed}
                  disabled={isPending}
                  className="w-6 h-6 rounded-full border-2 border-gray-900 data-[state=checked]:bg-gray-900"
                />
                <Label htmlFor="all" className="text-body font-semibold text-gray-900 cursor-pointer">
                  전체 동의
                </Label>
              </div>

              <div className="space-y-3 pl-2">
                {/* 이용약관 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="terms"
                      checked={agreements.terms}
                      onCheckedChange={(checked) =>
                        setAgreements({ ...agreements, terms: checked as boolean })
                      }
                      disabled={isPending}
                      className="rounded"
                    />
                    <Label htmlFor="terms" className="text-caption text-gray-700 cursor-pointer">
                      [필수] 이용약관 동의
                    </Label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-small text-gray-400 hover:text-gray-600 h-auto p-0"
                  >
                    보기
                  </Button>
                </div>

                {/* 개인정보 수집 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="privacy"
                      checked={agreements.privacy}
                      onCheckedChange={(checked) =>
                        setAgreements({ ...agreements, privacy: checked as boolean })
                      }
                      disabled={isPending}
                      className="rounded"
                    />
                    <Label htmlFor="privacy" className="text-caption text-gray-700 cursor-pointer">
                      [필수] 개인정보 수집 및 이용 동의
                    </Label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-small text-gray-400 hover:text-gray-600 h-auto p-0"
                  >
                    보기
                  </Button>
                </div>

                {/* 위치기반 서비스 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="location"
                      checked={agreements.location}
                      onCheckedChange={(checked) =>
                        setAgreements({ ...agreements, location: checked as boolean })
                      }
                      disabled={isPending}
                      className="rounded"
                    />
                    <Label htmlFor="location" className="text-caption text-gray-700 cursor-pointer">
                      [필수] 위치기반 서비스 이용약관 동의
                    </Label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-small text-gray-400 hover:text-gray-600 h-auto p-0"
                  >
                    보기
                  </Button>
                </div>

                {/* 마케팅 수신 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="marketing"
                      checked={agreements.marketing}
                      onCheckedChange={(checked) =>
                        setAgreements({ ...agreements, marketing: checked as boolean })
                      }
                      disabled={isPending}
                      className="rounded"
                    />
                    <Label htmlFor="marketing" className="text-caption text-gray-500 cursor-pointer">
                      [선택] 마케팅 정보 수신 동의
                    </Label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-small text-gray-400 hover:text-gray-600 h-auto p-0"
                  >
                    보기
                  </Button>
                </div>

                {/* 마케팅 수신 방법 */}
                <div className="flex items-center gap-4 pl-9">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="sms"
                      checked={marketingChannels.sms}
                      onCheckedChange={(checked) =>
                        setMarketingChannels({ ...marketingChannels, sms: checked as boolean })
                      }
                      disabled={isPending}
                      className="w-[18px] h-[18px] rounded"
                    />
                    <Label htmlFor="sms" className="text-small text-gray-500 cursor-pointer">
                      SMS
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="email-marketing"
                      checked={marketingChannels.email}
                      onCheckedChange={(checked) =>
                        setMarketingChannels({ ...marketingChannels, email: checked as boolean })
                      }
                      disabled={isPending}
                      className="w-[18px] h-[18px] rounded"
                    />
                    <Label htmlFor="email-marketing" className="text-small text-gray-500 cursor-pointer">
                      이메일
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="push"
                      checked={marketingChannels.push}
                      onCheckedChange={(checked) =>
                        setMarketingChannels({ ...marketingChannels, push: checked as boolean })
                      }
                      disabled={isPending}
                      className="w-[18px] h-[18px] rounded"
                    />
                    <Label htmlFor="push" className="text-small text-gray-500 cursor-pointer">
                      앱 푸시
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            {/* 가입 버튼 */}
            <Button
              type="submit"
              disabled={isPending || !isFormValid()}
              variant="brand-primary"
              className="w-full py-6 mt-8 h-auto text-[16px]"
            >
              {isPending ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  가입 중...
                </>
              ) : (
                "가입하기"
              )}
            </Button>
          </form>

          {/* 로그인 링크 */}
          <p className="text-center text-caption text-gray-500 mt-6">
            이미 회원이신가요?
            <Link href="/login" className="font-semibold text-gray-900 hover:underline ml-1">
              로그인
            </Link>
          </p>
        </div>
      </main>

      {/* 하단 고정 영역 (모바일) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
        <Button
          onClick={(e) => {
            e.preventDefault();
            const form = document.querySelector('form');
            if (form) {
              form.requestSubmit();
            }
          }}
          disabled={isPending}
          variant="brand-primary"
          className="w-full py-6 h-auto text-[16px]"
        >
          {isPending ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              가입 중...
            </>
          ) : (
            "가입하기"
          )}
        </Button>
      </div>

      {/* 푸터 (데스크탑만) */}
      <footer className="border-t border-gray-100 py-6 px-page md:block hidden">
        <div className="max-w-[520px] mx-auto">
          <p className="text-[12px] text-gray-400 text-center">
            © 2024 우리동네금은방. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
