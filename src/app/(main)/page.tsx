"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Search,
  DollarSign,
  MapPin,
  Store,
  Heart,
  ArrowDown,
  ArrowUp,
  LogIn,
  Mountain,
  BookHeart,
} from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { getLatestGoldPricesAction } from "@/actions/goldPrices";
import { getStoresAction } from "@/actions/stores";
import { getAddressesAction } from "@/actions/address";
import type { GoldPrice } from "@/types/goldPrices";
import type { StoreDetail } from "@/types/stores";
import { Section, Container, SectionHeader } from "@/components/layout-primitives";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user, tokens } = useAuthStore();

  // 금 시세 상태
  const [goldPrices, setGoldPrices] = useState<GoldPrice[]>([]);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);

  // 매장 상태
  const [nearbyStores, setNearbyStores] = useState<StoreDetail[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [userAddress, setUserAddress] = useState<string>("");
  const [userRegion, setUserRegion] = useState<string>("");
  const [userDistrict, setUserDistrict] = useState<string>("");

  // 검색 상태
  const [searchQuery, setSearchQuery] = useState<string>("");

  // 검색 핸들러
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/stores?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // 금 시세 데이터 가져오기
  useEffect(() => {
    const fetchGoldPrices = async () => {
      setIsLoadingPrices(true);
      const result = await getLatestGoldPricesAction();
      if (result.success && result.data) {
        setGoldPrices(result.data);
      }
      setIsLoadingPrices(false);
    };

    fetchGoldPrices();
  }, []);

  // 사용자 주소 및 주변 매장 데이터 가져오기
  useEffect(() => {
    const fetchNearbyStores = async () => {
      if (!isAuthenticated || !tokens?.access_token) {
        setNearbyStores([]);
        setUserAddress("");
        return;
      }

      setIsLoadingStores(true);

      // 사용자 주소 가져오기
      const addressResult = await getAddressesAction(tokens.access_token);
      if (addressResult.success && addressResult.data?.addresses && addressResult.data.addresses.length > 0) {
        const defaultAddress = addressResult.data.addresses.find((addr) => addr.is_default);
        const address = defaultAddress || addressResult.data.addresses[0];

        if (address) {
          setUserAddress(address.address || "주소 정보 없음");

          // 주소에서 지역 정보 추출 (예: "서울특별시 강남구" -> region: "서울특별시", district: "강남구")
          const addressParts = address.address?.split(" ") || [];
          if (addressParts.length >= 2) {
            setUserRegion(addressParts[0]);
            setUserDistrict(addressParts[1]);
          }

          // 주변 매장 검색 (일단 전체 매장 중 3개)
          const storesResult = await getStoresAction({
            page: 1,
            page_size: 3,
          });

          if (storesResult.success && storesResult.data?.stores) {
            setNearbyStores(storesResult.data.stores);
          }
        }
      } else {
        // 주소가 없으면 기본 주소 설정 유도
        setUserAddress("주소를 등록해주세요");
      }

      setIsLoadingStores(false);
    };

    fetchNearbyStores();
  }, [isAuthenticated, tokens]);

  // 금 시세 데이터 매핑
  const goldPriceDisplay = goldPrices.length > 0
    ? goldPrices.slice(0, 4).map((price) => ({
        karat: price.type,
        name: price.type === "24K" ? "순금" : price.type === "18K" ? "18K금" : price.type === "14K" ? "14K금" : price.type === "Platinum" ? "백금" : "은",
        price: `${Math.floor(price.buy_price).toLocaleString()}원`,
        change: Math.floor(price.change_amount || 0),
        changePercent: price.change_percent || 0,
        bgColor: price.type.includes("K") ? "bg-yellow-100" : "bg-gray-100",
        textColor: price.type.includes("K") ? "text-yellow-700" : "text-gray-700",
      }))
    : [
        { karat: "24K", name: "순금", price: "452,000원", change: -1000, changePercent: -0.22, bgColor: "bg-yellow-100", textColor: "text-yellow-700" },
        { karat: "18K", name: "18K금", price: "339,000원", change: 500, changePercent: 0.15, bgColor: "bg-yellow-100", textColor: "text-yellow-700" },
        { karat: "14K", name: "14K금", price: "264,000원", change: 0, changePercent: 0, bgColor: "bg-yellow-100", textColor: "text-yellow-700" },
        { karat: "Pt", name: "백금", price: "158,000원", change: 2000, changePercent: 1.28, bgColor: "bg-gray-100", textColor: "text-gray-700" },
      ];

  return (
    <main>
      {/* 히어로 섹션 */}
      <Section background="gradient" className="pt-16 pb-20">
        <Container>
          {/* 실시간 시세 배너 */}
          {goldPrices.length > 0 && goldPrices[0] && (
            <div className="inline-flex items-center gap-3 px-4 py-2.5 bg-white rounded-full border border-gray-200 mb-8">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full pulse-soft"></span>
                <span className="text-small font-medium text-gray-500">오늘의 시세</span>
              </span>
              <span className="text-small text-gray-300">|</span>
              <span className="text-caption font-semibold text-gray-900">{goldPrices[0].type} 금 시세</span>
              <span className="text-body font-bold text-gray-900">{Math.floor(goldPrices[0].buy_price).toLocaleString()}원</span>
              {goldPrices[0].change_amount !== undefined && goldPrices[0].change_amount !== 0 && (
                <span className={`flex items-center text-small font-semibold ${goldPrices[0].change_amount > 0 ? "text-green-500" : "text-red-500"}`}>
                  {goldPrices[0].change_amount > 0 ? (
                    <ArrowUp className="w-3 h-3 mr-0.5" />
                  ) : (
                    <ArrowDown className="w-3 h-3 mr-0.5" />
                  )}
                  {Math.floor(Math.abs(goldPrices[0].change_amount)).toLocaleString()}
                </span>
              )}
            </div>
          )}

          {/* 히어로 텍스트 */}
          <div className="mb-12">
            <h1 className="text-[28px] sm:text-[40px] md:text-[52px] font-bold leading-[1.2] tracking-[-0.02em] text-gray-900 mb-5">
              투명한 금 거래,
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-yellow-600">
                쉽고 빠르게
              </span>
            </h1>
            <p className="text-[17px] md:text-[19px] text-gray-500 leading-relaxed font-normal">
              오늘의 금 시세와 내 주변 금은방의 정보를
              <br className="hidden md:block" />
              한 곳에서 비교하고 확인하세요
            </p>
          </div>

          {/* 검색바 */}
          <form onSubmit={handleSearch} className="search-container max-w-[580px] bg-white border-2 border-gray-200 rounded-2xl p-1.5 flex items-center smooth-transition hover:border-gray-300">
            <div className="flex-1 flex items-center gap-3 px-4">
              <Search className="w-5 h-5 text-gray-500" />
              <Input
                type="text"
                placeholder="지역, 매장명을 검색해보세요"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input flex-1 py-3 text-body text-gray-900 placeholder-gray-500 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <Button type="submit" variant="brand-primary" size="lg">
              검색
            </Button>
          </form>

          {/* 인기 검색어 */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <span className="text-small text-gray-600">인기</span>
            {["강남", "종로", "24K 반지", "금목걸이"].map((keyword) => (
              <Badge
                key={keyword}
                variant="secondary"
                onClick={() => router.push(`/stores?search=${encodeURIComponent(keyword)}`)}
                className="px-4 py-2.5 min-h-[44px] bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-full text-small text-gray-600 smooth-transition cursor-pointer flex items-center"
              >
                {keyword}
              </Badge>
            ))}
          </div>
        </Container>
      </Section>

      {/* 빠른 메뉴 */}
      <Section>
        <Container>
          <div className={`grid gap-8 ${isAuthenticated ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5' : 'grid-cols-3 sm:grid-cols-4'}`}>
            {/* 금시세 */}
            <Link
              href="/prices"
              className="group flex flex-col items-center gap-3 smooth-transition"
            >
              <div className="w-16 h-16 bg-yellow-50 border-2 border-yellow-200 rounded-2xl flex items-center justify-center md:group-hover:scale-110 transition-transform duration-200">
                <DollarSign className="w-8 h-8 text-yellow-600" />
              </div>
              <span className="text-caption font-medium text-gray-700 text-center group-hover:text-gray-900">금시세</span>
            </Link>

            {/* 매장찾기 */}
            <Link
              href="/stores"
              className="group flex flex-col items-center gap-3 smooth-transition"
            >
              <div className="w-16 h-16 bg-blue-50 border-2 border-blue-200 rounded-2xl flex items-center justify-center md:group-hover:scale-110 transition-transform duration-200">
                <MapPin className="w-8 h-8 text-blue-600" />
              </div>
              <span className="text-caption font-medium text-gray-700 text-center group-hover:text-gray-900">매장찾기</span>
            </Link>

            {/* 금광산 (커뮤니티) */}
            <Link
              href="/community"
              className="group flex flex-col items-center gap-3 smooth-transition"
            >
              <div className="w-16 h-16 bg-purple-50 border-2 border-purple-200 rounded-2xl flex items-center justify-center md:group-hover:scale-110 transition-transform duration-200">
                <Mountain className="w-8 h-8 text-purple-600" />
              </div>
              <span className="text-caption font-medium text-gray-700 text-center group-hover:text-gray-900">금광산</span>
            </Link>

            {/* 관심글 - 로그인 시에만 표시 */}
            {isAuthenticated && (
              <Link
                href="/community?liked=true"
                className="group flex flex-col items-center gap-3 smooth-transition"
              >
                <div className="w-16 h-16 bg-rose-50 border-2 border-rose-200 rounded-2xl flex items-center justify-center md:group-hover:scale-110 transition-transform duration-200">
                  <BookHeart className="w-8 h-8 text-rose-600" />
                </div>
                <span className="text-caption font-medium text-gray-700 text-center group-hover:text-gray-900">관심글</span>
              </Link>
            )}

            {/* 조건부 마지막 버튼 */}
            {!isAuthenticated ? (
              // 로그인 안됨 - 로그인 버튼
              <Link
                href="/login"
                className="group flex flex-col items-center gap-3 smooth-transition"
              >
                <div className="w-16 h-16 bg-gray-50 border-2 border-gray-200 rounded-2xl flex items-center justify-center md:group-hover:scale-110 transition-transform duration-200">
                  <LogIn className="w-8 h-8 text-gray-600" />
                </div>
                <span className="text-caption font-medium text-gray-700 text-center group-hover:text-gray-900">로그인</span>
              </Link>
            ) : user?.role === "admin" ? (
              // 로그인 + admin - 내매장 버튼
              <Link
                href="/mystore"
                className="group flex flex-col items-center gap-3 smooth-transition"
              >
                <div className="w-16 h-16 bg-green-50 border-2 border-green-200 rounded-2xl flex items-center justify-center md:group-hover:scale-110 transition-transform duration-200">
                  <Store className="w-8 h-8 text-green-600" />
                </div>
                <span className="text-caption font-medium text-gray-700 text-center group-hover:text-gray-900">내매장</span>
              </Link>
            ) : (
              // 로그인 + user - 관심매장 버튼
              <Link
                href="/favorite-stores"
                className="group flex flex-col items-center gap-3 smooth-transition"
              >
                <div className="w-16 h-16 bg-pink-50 border-2 border-pink-200 rounded-2xl flex items-center justify-center md:group-hover:scale-110 transition-transform duration-200">
                  <Heart className="w-8 h-8 text-pink-600" />
                </div>
                <span className="text-caption font-medium text-gray-700 text-center group-hover:text-gray-900">관심매장</span>
              </Link>
            )}
          </div>
        </Container>
      </Section>

      {/* 오늘의 금 시세 */}
      <Section background="gray">
        <Container>
          <SectionHeader
            title="오늘의 금 시세"
            description="금 시세는 매일 아침 9시에 업데이트 됩니다."
            action={
              <Link href="/prices" className="text-caption font-medium text-gray-600 hover:text-gray-900 smooth-transition flex items-center gap-1">
                전체보기
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"></path>
                </svg>
              </Link>
            }
          />

          {isLoadingPrices ? (
            <div className="text-center py-page">
              <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
              <p className="text-gray-500 text-caption mt-4">금 시세 불러오는 중...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {goldPriceDisplay.map((item) => (
              <Card key={item.karat} className="bg-white p-5 rounded-2xl card-shadow smooth-transition hover-lift cursor-pointer border-0">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 ${item.bgColor} rounded-lg flex items-center justify-center`}>
                    <span className={`text-[12px] font-bold ${item.textColor}`}>{item.karat}</span>
                  </div>
                  <span className="text-body font-semibold text-gray-900">{item.name}</span>
                </div>
                <div className="text-[20px] font-bold text-gray-900 mb-1">{item.price}</div>
                <div className={`flex items-center gap-1 text-small font-medium ${item.change > 0 ? "text-green-500" : item.change < 0 ? "text-red-500" : "text-gray-400"}`}>
                  {item.change !== 0 ? (item.change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <span>-</span>}
                  {item.change !== 0 ? `${Math.abs(item.change).toLocaleString()} (${item.change > 0 ? "+" : ""}${item.changePercent}%)` : "0 (0.00%)"}
                </div>
              </Card>
            ))}
            </div>
          )}
        </Container>
      </Section>

      {/* 내 주변 금은방 */}
      <Section background="gray">
        <Container>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-section-title font-bold text-gray-900 mb-1">내 주변 금은방</h2>
              <p className="text-caption text-gray-600">
                {isAuthenticated ? (userAddress || "주소를 등록해주세요") : "로그인 후 이용 가능합니다"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isAuthenticated && nearbyStores.length > 0 && (
                <Link
                  href={`/stores${userRegion && userDistrict ? `?region=${encodeURIComponent(userRegion)}&district=${encodeURIComponent(userDistrict)}` : ""}`}
                  className="text-caption font-medium text-gray-600 hover:text-gray-900 smooth-transition flex items-center gap-1"
                >
                  전체보기
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"></path>
                  </svg>
                </Link>
              )}
              {isAuthenticated && (
                <Link href="/mypage/addresses">
                  <Button variant="outline" className="flex items-center gap-1.5 px-4 py-3 min-h-[44px] bg-white border border-gray-200 rounded-lg text-small font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100">
                    <MapPin className="w-4 h-4" />
                    주소 변경
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {!isAuthenticated ? (
            // 로그인 안됨 - 로그인 유도 메시지
            <div className="bg-white rounded-2xl p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-[18px] font-semibold text-gray-900 mb-2">
                로그인이 필요합니다
              </h3>
              <p className="text-caption text-gray-600 mb-6">
                로그인하시면 내 주변 금은방을 확인할 수 있습니다
              </p>
              <Link href="/login">
                <Button variant="brand-primary" size="lg" className="px-8 py-3">
                  로그인하기
                </Button>
              </Link>
            </div>
          ) : isLoadingStores ? (
            <div className="text-center py-page">
              <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
              <p className="text-gray-500 text-caption mt-4">매장 정보 불러오는 중...</p>
            </div>
          ) : nearbyStores.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {nearbyStores.map((store) => (
                <Link key={store.id} href={`/stores/${store.id}`} className="bg-white p-5 rounded-2xl card-shadow smooth-transition hover-lift flex gap-4">
                  <div className="w-20 h-20 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Store className="w-10 h-10 text-yellow-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[16px] font-semibold text-gray-900">{store.name}</span>
                      {store.business_hours && (
                        <Badge className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[11px] font-medium rounded">영업중</Badge>
                      )}
                    </div>
                    <div className="text-small text-gray-500 mb-2">{store.address || `${store.region || ""} ${store.district || ""}`.trim()}</div>
                    <div className="flex items-center gap-2 text-small">
                      {store.phone_number && (
                        <>
                          <span className="text-gray-500">{store.phone_number}</span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Store className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-[18px] font-semibold text-gray-900 mb-2">
                주변 매장이 없습니다
              </h3>
              <p className="text-caption text-gray-600 mb-6">
                다른 지역의 매장을 찾아보세요
              </p>
              <Link href="/stores">
                <Button variant="brand-primary" size="lg" className="px-8 py-3">
                  매장 찾기
                </Button>
              </Link>
            </div>
          )}
        </Container>
      </Section>

      {/* CTA 배너 */}
      <Section className="py-16">
        <Container>
          <div className="bg-gray-900 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-[24px] md:text-[28px] font-bold text-white mb-2">금은방 사장님이신가요?</h3>
              <p className="text-body text-gray-400">무료로 매장을 등록하고 더 많은 고객을 만나보세요</p>
            </div>
            <Button variant="outline" size="lg" className="px-8 py-4 flex-shrink-0 bg-white hover:bg-gray-100 text-gray-900">
              매장 등록하기
            </Button>
          </div>
        </Container>
      </Section>
    </main>
  );
}