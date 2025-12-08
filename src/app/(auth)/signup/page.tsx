"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
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

  const handleSocialSignup = (provider: string) => {
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userName", `${provider} 사용자`);
    router.push("/");
  };

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

  const handleSignup = () => {
    // 실제로는 API 호출
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userName", name || "사용자");
    router.push("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* 헤더 */}
      <header className="w-full bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-[520px] mx-auto px-5 h-[60px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900">우리동네금은방</span>
          </Link>
          <Link href="/login" className="text-[14px] text-gray-500 hover:text-gray-900 smooth-transition">
            로그인
          </Link>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 flex flex-col">
        <div className="max-w-[520px] w-full mx-auto px-5 py-10">
          {/* 스텝 인디케이터 */}
          <div className="flex items-center justify-center gap-4 mb-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center text-[13px] font-semibold">
                1
              </div>
              <span className="text-[13px] font-medium text-gray-900 hidden sm:block">정보입력</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-200"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-[13px] font-semibold text-gray-500">
                2
              </div>
              <span className="text-[13px] font-medium text-gray-400 hidden sm:block">약관동의</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-200"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-[13px] font-semibold text-gray-500">
                3
              </div>
              <span className="text-[13px] font-medium text-gray-400 hidden sm:block">가입완료</span>
            </div>
          </div>

          {/* 타이틀 */}
          <div className="text-center mb-10">
            <h1 className="text-[26px] font-bold text-gray-900 mb-2">회원가입</h1>
            <p className="text-[15px] text-gray-500">간편하게 가입하고 다양한 서비스를 이용하세요</p>
          </div>

          {/* 소셜 회원가입 */}
          <div className="space-y-3 mb-8">
            {/* 카카오 */}
            <Button
              type="button"
              onClick={() => handleSocialSignup("카카오")}
              className="w-full flex items-center justify-center gap-3 py-6 bg-[#FEE500] hover:bg-[#FEE500]/90 text-gray-900 rounded-xl text-[15px] font-semibold smooth-transition h-auto"
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
              className="w-full flex items-center justify-center gap-3 py-6 bg-[#03C75A] hover:bg-[#03C75A]/90 text-white rounded-xl text-[15px] font-semibold smooth-transition h-auto"
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
            <span className="text-[13px] text-gray-400">또는 이메일로 가입</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {/* 회원가입 폼 */}
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handleSignup(); }}>
            {/* 이메일 */}
            <div>
              <Label className="block text-[13px] font-semibold text-gray-900 mb-2">
                이메일 <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-6 bg-gray-100 border-transparent focus:border-gray-900 focus:bg-white rounded-xl text-[15px] placeholder-gray-400 smooth-transition"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="px-5 py-6 bg-gray-200 hover:bg-gray-300 text-gray-700 text-[14px] font-semibold rounded-xl whitespace-nowrap"
                >
                  인증요청
                </Button>
              </div>
              <p className="mt-2 text-[12px] text-gray-500">로그인 및 주요 알림에 사용됩니다</p>
            </div>

            {/* 비밀번호 */}
            <div>
              <Label className="block text-[13px] font-semibold text-gray-900 mb-2">
                비밀번호 <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="8자 이상, 영문/숫자/특수문자 조합"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-6 bg-gray-100 border-transparent focus:border-gray-900 focus:bg-white rounded-xl text-[15px] placeholder-gray-400 smooth-transition pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 smooth-transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {/* 비밀번호 강도 표시 */}
              <div className="flex gap-1 mt-3">
                <div className="h-1 flex-1 bg-gray-200 rounded-full"></div>
                <div className="h-1 flex-1 bg-gray-200 rounded-full"></div>
                <div className="h-1 flex-1 bg-gray-200 rounded-full"></div>
                <div className="h-1 flex-1 bg-gray-200 rounded-full"></div>
              </div>
              <p className="text-[12px] text-gray-400 mt-2">
                비밀번호 강도: <span className="text-gray-500">입력해주세요</span>
              </p>
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <Label className="block text-[13px] font-semibold text-gray-900 mb-2">
                비밀번호 확인 <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showPasswordConfirm ? "text" : "password"}
                  placeholder="비밀번호를 한번 더 입력하세요"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="w-full px-4 py-6 bg-gray-100 border-transparent focus:border-gray-900 focus:bg-white rounded-xl text-[15px] placeholder-gray-400 smooth-transition pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 smooth-transition"
                >
                  {showPasswordConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* 이름 */}
            <div>
              <Label className="block text-[13px] font-semibold text-gray-900 mb-2">
                이름 <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                placeholder="실명을 입력하세요"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-6 bg-gray-100 border-transparent focus:border-gray-900 focus:bg-white rounded-xl text-[15px] placeholder-gray-400 smooth-transition"
              />
            </div>

            {/* 휴대폰 번호 */}
            <div>
              <Label className="block text-[13px] font-semibold text-gray-900 mb-2">
                휴대폰 번호 <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  type="tel"
                  placeholder="'-' 없이 숫자만 입력"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 px-4 py-6 bg-gray-100 border-transparent focus:border-gray-900 focus:bg-white rounded-xl text-[15px] placeholder-gray-400 smooth-transition"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="px-5 py-6 bg-gray-200 hover:bg-gray-300 text-gray-700 text-[14px] font-semibold rounded-xl whitespace-nowrap"
                >
                  인증요청
                </Button>
              </div>
            </div>

            {/* 구분선 */}
            <Separator className="my-8" />

            {/* 약관 동의 */}
            <div className="space-y-4">
              <h3 className="text-[15px] font-semibold text-gray-900">약관 동의</h3>

              {/* 전체 동의 */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <Checkbox
                  id="all"
                  checked={allAgreed}
                  onCheckedChange={handleAllAgreed}
                  className="w-6 h-6 rounded-full border-2 border-gray-900 data-[state=checked]:bg-gray-900"
                />
                <Label htmlFor="all" className="text-[15px] font-semibold text-gray-900 cursor-pointer">
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
                      onCheckedChange={(checked) => setAgreements({ ...agreements, terms: checked as boolean })}
                      className="rounded"
                    />
                    <Label htmlFor="terms" className="text-[14px] text-gray-700 cursor-pointer">
                      [필수] 이용약관 동의
                    </Label>
                  </div>
                  <Button type="button" variant="ghost" className="text-[13px] text-gray-400 hover:text-gray-600 h-auto p-0">
                    보기
                  </Button>
                </div>

                {/* 개인정보 수집 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="privacy"
                      checked={agreements.privacy}
                      onCheckedChange={(checked) => setAgreements({ ...agreements, privacy: checked as boolean })}
                      className="rounded"
                    />
                    <Label htmlFor="privacy" className="text-[14px] text-gray-700 cursor-pointer">
                      [필수] 개인정보 수집 및 이용 동의
                    </Label>
                  </div>
                  <Button type="button" variant="ghost" className="text-[13px] text-gray-400 hover:text-gray-600 h-auto p-0">
                    보기
                  </Button>
                </div>

                {/* 위치기반 서비스 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="location"
                      checked={agreements.location}
                      onCheckedChange={(checked) => setAgreements({ ...agreements, location: checked as boolean })}
                      className="rounded"
                    />
                    <Label htmlFor="location" className="text-[14px] text-gray-700 cursor-pointer">
                      [필수] 위치기반 서비스 이용약관 동의
                    </Label>
                  </div>
                  <Button type="button" variant="ghost" className="text-[13px] text-gray-400 hover:text-gray-600 h-auto p-0">
                    보기
                  </Button>
                </div>

                {/* 마케팅 수신 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="marketing"
                      checked={agreements.marketing}
                      onCheckedChange={(checked) => setAgreements({ ...agreements, marketing: checked as boolean })}
                      className="rounded"
                    />
                    <Label htmlFor="marketing" className="text-[14px] text-gray-500 cursor-pointer">
                      [선택] 마케팅 정보 수신 동의
                    </Label>
                  </div>
                  <Button type="button" variant="ghost" className="text-[13px] text-gray-400 hover:text-gray-600 h-auto p-0">
                    보기
                  </Button>
                </div>

                {/* 마케팅 수신 방법 */}
                <div className="flex items-center gap-4 pl-9">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="sms"
                      checked={marketingChannels.sms}
                      onCheckedChange={(checked) => setMarketingChannels({ ...marketingChannels, sms: checked as boolean })}
                      className="w-[18px] h-[18px] rounded"
                    />
                    <Label htmlFor="sms" className="text-[13px] text-gray-500 cursor-pointer">SMS</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="email-marketing"
                      checked={marketingChannels.email}
                      onCheckedChange={(checked) => setMarketingChannels({ ...marketingChannels, email: checked as boolean })}
                      className="w-[18px] h-[18px] rounded"
                    />
                    <Label htmlFor="email-marketing" className="text-[13px] text-gray-500 cursor-pointer">이메일</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="push"
                      checked={marketingChannels.push}
                      onCheckedChange={(checked) => setMarketingChannels({ ...marketingChannels, push: checked as boolean })}
                      className="w-[18px] h-[18px] rounded"
                    />
                    <Label htmlFor="push" className="text-[13px] text-gray-500 cursor-pointer">앱 푸시</Label>
                  </div>
                </div>
              </div>
            </div>

            {/* 가입 버튼 */}
            <Button
              type="submit"
              className="w-full py-6 bg-gray-900 hover:bg-gray-800 text-white text-[16px] font-semibold rounded-xl smooth-transition mt-8 h-auto"
            >
              가입하기
            </Button>
          </form>

          {/* 로그인 링크 */}
          <p className="text-center text-[14px] text-gray-500 mt-6">
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
          onClick={handleSignup}
          className="w-full py-6 bg-gray-900 hover:bg-gray-800 text-white text-[16px] font-semibold rounded-xl smooth-transition h-auto"
        >
          가입하기
        </Button>
      </div>

      {/* 푸터 (데스크탑만) */}
      <footer className="border-t border-gray-100 py-6 px-5 md:block hidden">
        <div className="max-w-[520px] mx-auto">
          <p className="text-[12px] text-gray-400 text-center">
            © 2024 우리동네금은방. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
