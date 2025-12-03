"use client";

import Link from "next/link";
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
  Tag,
  ClipboardList,
  Menu,
  ArrowDown,
  ArrowUp,
} from "lucide-react";

export default function Home() {
  return (
    <main>
      {/* 히어로 섹션 */}
      <section className="pt-16 pb-20 px-5 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-[1200px] mx-auto">
          {/* 실시간 시세 배너 */}
          <div className="inline-flex items-center gap-3 px-4 py-2.5 bg-white rounded-full border border-gray-200 mb-8">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full pulse-soft"></span>
              <span className="text-[13px] font-medium text-gray-500">실시간</span>
            </span>
            <span className="text-[13px] text-gray-300">|</span>
            <span className="text-[14px] font-semibold text-gray-900">24K 금 시세</span>
            <span className="text-[15px] font-bold text-gray-900">452,000원</span>
            <span className="flex items-center text-[13px] font-semibold text-red-500">
              <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                ></path>
              </svg>
              1,000
            </span>
          </div>

          {/* 히어로 텍스트 */}
          <div className="mb-12">
            <h1 className="text-[40px] md:text-[52px] font-bold leading-[1.2] tracking-[-0.02em] text-gray-900 mb-5">
              투명한 금 거래,
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-yellow-600">
                쉽고 빠르게
              </span>
            </h1>
            <p className="text-[17px] md:text-[19px] text-gray-500 leading-relaxed font-normal">
              내 주변 금은방의 실시간 시세와 매장 정보를
              <br className="hidden md:block" />
              한 곳에서 비교하고 확인하세요
            </p>
          </div>

          {/* 검색바 */}
          <div className="search-container max-w-[580px] bg-white border-2 border-gray-200 rounded-2xl p-1.5 flex items-center smooth-transition hover:border-gray-300">
            <div className="flex-1 flex items-center gap-3 px-4">
              <Search className="w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="지역, 매장명을 검색해보세요"
                className="search-input flex-1 py-3 text-[15px] text-gray-900 placeholder-gray-400 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <Button className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white text-[15px] font-semibold rounded-xl smooth-transition">
              검색
            </Button>
          </div>

          {/* 인기 검색어 */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <span className="text-[13px] text-gray-400">인기</span>
            {["강남", "종로", "24K 반지", "금목걸이"].map((keyword) => (
              <Badge
                key={keyword}
                variant="secondary"
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-[13px] text-gray-600 smooth-transition cursor-pointer"
              >
                {keyword}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* 빠른 메뉴 */}
      <section className="py-12 px-5">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
            {[
              { icon: DollarSign, label: "금시세", href: "/price", bgColor: "bg-yellow-50", iconColor: "text-yellow-600" },
              { icon: MapPin, label: "내주변", href: "/stores", bgColor: "bg-blue-50", iconColor: "text-blue-600" },
              { icon: Store, label: "매장찾기", href: "/stores", bgColor: "bg-purple-50", iconColor: "text-purple-600" },
              { icon: Heart, label: "찜목록", href: "/mypage", bgColor: "bg-pink-50", iconColor: "text-pink-600" },
              { icon: Tag, label: "이벤트", href: "#", bgColor: "bg-orange-50", iconColor: "text-orange-600" },
              { icon: ClipboardList, label: "주문내역", href: "/mypage", bgColor: "bg-cyan-50", iconColor: "text-cyan-600" },
              { icon: Menu, label: "전체메뉴", href: "#", bgColor: "bg-gray-100", iconColor: "text-gray-600" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="group flex flex-col items-center gap-3 p-4 rounded-2xl hover:bg-gray-50 smooth-transition"
              >
                <div className={`w-14 h-14 ${item.bgColor} rounded-2xl flex items-center justify-center group-hover:scale-105 smooth-transition`}>
                  <item.icon className={`w-7 h-7 ${item.iconColor}`} />
                </div>
                <span className="text-[13px] font-medium text-gray-700 text-center">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 실시간 금 시세 */}
      <section className="py-12 px-5 bg-gray-50">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-[22px] font-bold text-gray-900 mb-1">실시간 금 시세</h2>
              <p className="text-[14px] text-gray-500">1분마다 업데이트됩니다</p>
            </div>
            <Link href="/price" className="text-[14px] font-medium text-gray-500 hover:text-gray-900 smooth-transition flex items-center gap-1">
              전체보기
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"></path>
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { karat: "24K", name: "순금", price: "452,000원", change: -1000, changePercent: -0.22, bgColor: "bg-yellow-100", textColor: "text-yellow-700" },
              { karat: "18K", name: "18K금", price: "339,000원", change: 500, changePercent: 0.15, bgColor: "bg-yellow-100", textColor: "text-yellow-700" },
              { karat: "14K", name: "14K금", price: "264,000원", change: 0, changePercent: 0, bgColor: "bg-yellow-100", textColor: "text-yellow-700" },
              { karat: "Pt", name: "백금", price: "158,000원", change: 2000, changePercent: 1.28, bgColor: "bg-gray-100", textColor: "text-gray-700" },
            ].map((item) => (
              <Card key={item.karat} className="bg-white p-5 rounded-2xl card-shadow smooth-transition hover-lift cursor-pointer border-0">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 ${item.bgColor} rounded-lg flex items-center justify-center`}>
                    <span className={`text-[12px] font-bold ${item.textColor}`}>{item.karat}</span>
                  </div>
                  <span className="text-[15px] font-semibold text-gray-900">{item.name}</span>
                </div>
                <div className="text-[20px] font-bold text-gray-900 mb-1">{item.price}</div>
                <div className={`flex items-center gap-1 text-[13px] font-medium ${item.change > 0 ? "text-green-500" : item.change < 0 ? "text-red-500" : "text-gray-400"}`}>
                  {item.change !== 0 ? (item.change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <span>-</span>}
                  {item.change !== 0 ? `${Math.abs(item.change).toLocaleString()} (${item.change > 0 ? "+" : ""}${item.changePercent}%)` : "0 (0.00%)"}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 내 주변 금은방 */}
      <section className="py-12 px-5 bg-gray-50">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-[22px] font-bold text-gray-900 mb-1">내 주변 금은방</h2>
              <p className="text-[14px] text-gray-500">서울 강남구 기준</p>
            </div>
            <Button variant="outline" className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-700 hover:bg-gray-50">
              <MapPin className="w-4 h-4" />
              위치 변경
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: 1, name: "강남금은방", address: "강남구 테헤란로 123", rating: 4.8, reviews: 128, distance: "350m", status: "영업중", statusColor: "bg-green-100 text-green-700", iconBg: "bg-yellow-100", iconColor: "text-yellow-600" },
              { id: 2, name: "종로주얼리", address: "강남구 역삼동 456", rating: 4.9, reviews: 89, distance: "520m", status: "영업중", statusColor: "bg-green-100 text-green-700", iconBg: "bg-blue-100", iconColor: "text-blue-600" },
              { id: 3, name: "다이아몬드하우스", address: "강남구 선릉로 789", rating: 4.7, reviews: 256, distance: "1.2km", status: "준비중", statusColor: "bg-gray-100 text-gray-600", iconBg: "bg-purple-100", iconColor: "text-purple-600" },
            ].map((store) => (
              <Link key={store.id} href={`/stores/${store.id}`} className="bg-white p-5 rounded-2xl card-shadow smooth-transition hover-lift flex gap-4">
                <div className={`w-20 h-20 ${store.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Store className={`w-10 h-10 ${store.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[16px] font-semibold text-gray-900">{store.name}</span>
                    <Badge className={`px-1.5 py-0.5 ${store.statusColor} text-[11px] font-medium rounded`}>{store.status}</Badge>
                  </div>
                  <div className="text-[13px] text-gray-500 mb-2">{store.address}</div>
                  <div className="flex items-center gap-2 text-[13px]">
                    <span className="text-yellow-500 font-medium">★ {store.rating}</span>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-500">리뷰 {store.reviews}</span>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-500">{store.distance}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA 배너 */}
      <section className="py-16 px-5">
        <div className="max-w-[1200px] mx-auto">
          <div className="bg-gray-900 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-[24px] md:text-[28px] font-bold text-white mb-2">금은방 사장님이신가요?</h3>
              <p className="text-[15px] text-gray-400">무료로 매장을 등록하고 더 많은 고객을 만나보세요</p>
            </div>
            <Button className="px-8 py-4 bg-white hover:bg-gray-100 text-gray-900 text-[15px] font-semibold rounded-xl smooth-transition flex-shrink-0">
              매장 등록하기
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
