"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, ShoppingBag, Heart, MapPin, Mail, Calendar, LogOut } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { logoutUserAction } from "@/actions/auth";
import { toast } from "sonner";

export default function MyPage() {
  const router = useRouter();
  const { isAuthenticated, user, tokens, clearAuth } = useAuthStore();

  useEffect(() => {
    // 로그인되지 않았으면 로그인 페이지로 이동
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  const handleLogout = async () => {
    try {
      if (tokens?.refresh_token) {
        await logoutUserAction(tokens.refresh_token);
      }
      clearAuth();
      toast.success("로그아웃되었습니다.");
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
      clearAuth();
      toast.success("로그아웃되었습니다.");
      router.push("/");
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="flex-grow py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Page Header */}
        <div className="mb-8 pb-6 border-b-2 border-gray-200">
          <div className="flex items-center gap-5">
            <Avatar className="w-20 h-20 border-4 border-gray-200">
              <AvatarFallback className="bg-gradient-to-br from-gray-900 to-gray-700 text-white">
                <User className="w-10 h-10" />
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <Badge className="mb-2 border-2 border-gray-900 text-gray-900 bg-gray-100 font-semibold">
                My Page
              </Badge>
              <h1 className="text-4xl font-bold text-gray-900">마이페이지</h1>
              <p className="text-base text-gray-600">회원 정보 및 주문 관리</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-2 border-gray-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <ShoppingBag className="w-6 h-6 text-gray-900" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">총 주문</p>
                  <p className="text-2xl font-bold text-gray-900">0건</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <Heart className="w-6 h-6 text-gray-900" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">찜한 상품</p>
                  <p className="text-2xl font-bold text-gray-900">0개</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <MapPin className="w-6 h-6 text-gray-900" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">배송지</p>
                  <p className="text-2xl font-bold text-gray-900">0개</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <User className="w-6 h-6 text-gray-900" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">포인트</p>
                  <p className="text-2xl font-bold text-gray-900">0P</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Info Card */}
          <Card className="border-2 border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-gray-900">회원 정보</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/mypage/edit")}
                  className="border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white"
                >
                  수정
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <User className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-600 w-20 flex-shrink-0">이름</span>
                    <span className="text-sm font-semibold text-gray-900 truncate">{user?.name || "-"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <Mail className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-600 w-20 flex-shrink-0">이메일</span>
                    <span className="text-sm font-semibold text-gray-900 truncate">{user?.email || "-"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-600 w-20 flex-shrink-0">전화번호</span>
                    <span className="text-sm font-semibold text-gray-900 truncate">{user?.phone || "-"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-600 w-20 flex-shrink-0">가입일</span>
                    <span className="text-sm font-semibold text-gray-900 truncate">
                      {user?.created_at
                        ? new Date(user.created_at).toLocaleDateString("ko-KR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => router.push("/mypage/addresses")}
                  className="w-full gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  배송지 관리
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900">빠른 메뉴</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Orders */}
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-gray-900" />
                      <h3 className="font-semibold text-gray-900">주문 내역</h3>
                    </div>
                    <span className="text-2xl font-bold text-gray-900">0</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-2">주문 내역이 없습니다</p>
                    <Button
                      className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                      size="sm"
                      onClick={() => router.push("/products")}
                    >
                      상품 둘러보기
                    </Button>
                  </div>
                </div>

                {/* Wishlist */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Heart className="w-5 h-5 text-gray-900" />
                      <h3 className="font-semibold text-gray-900">찜 목록</h3>
                    </div>
                    <span className="text-2xl font-bold text-gray-900">0</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-2">찜한 상품이 없습니다</p>
                    <Button
                      className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                      size="sm"
                      onClick={() => router.push("/wishlist")}
                    >
                      찜 목록 보기
                    </Button>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 my-4"></div>

              <Button
                variant="destructive"
                onClick={handleLogout}
                className="w-full gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>로그아웃</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
