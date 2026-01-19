"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Virtuoso } from "react-virtuoso";
import {
  User,
  Heart,
  MapPin,
  Mail,
  LogOut,
  Phone,
  FileText,
  MessageCircle,
  Store,
  Edit,
  Clock,
  Eye,
  ThumbsUp,
  Camera,
  Bell,
} from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logoutUserAction, updateProfileAction } from "@/actions/auth";
import { getPostsAction } from "@/actions/community";
import { getPresignedUrlAction, uploadToS3 } from "@/actions/upload";
import { getUserLikedStoresAction, getMyStoreAction } from "@/actions/stores";
import {
  getNotificationSettingsAction,
  updateNotificationSettingsAction,
} from "@/actions/notifications";
import { Container } from "@/components/layout-primitives";
import type { CommunityPost } from "@/types/community";
import type { StoreDetail } from "@/types/stores";
import type { NotificationSettings, NotificationRange } from "@/types/notification";
import { NOTIFICATION_RANGE_LABELS } from "@/types/notification";
import { KOREA_REGIONS } from "@/lib/regions";
import { toast } from "sonner";
import { X } from "lucide-react";
import { getUserImageUrl } from "@/lib/utils";

export default function MyPage() {
  const router = useRouter();
  const { isAuthenticated, user, tokens, clearAuth, updateUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 작성한 글 상태
  const [myPosts, setMyPosts] = useState<CommunityPost[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // 프로필 이미지 업로드 상태
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // 좋아요한 매장 상태
  const [likedStores, setLikedStores] = useState<StoreDetail[]>([]);
  const [totalLikedStores, setTotalLikedStores] = useState(0);
  const [isLoadingStores, setIsLoadingStores] = useState(false);

  // admin 사용자의 매장 상태
  const [myStore, setMyStore] = useState<StoreDetail | null>(null);
  const [isLoadingMyStore, setIsLoadingMyStore] = useState(false);

  // 알림 설정 상태 (admin 전용)
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(
    null
  );
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // 지역 선택 상태 (알림 설정용)
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");

  // admin 권한 확인
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // 🚀 병렬 API 호출 최적화: 페이지 로드 시 모든 데이터를 동시에 가져옴
  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true; // cleanup을 위한 플래그

    const fetchAllData = async () => {
      const promises: Promise<any>[] = [];

      // 1. 작성한 글 불러오기 (모든 사용자)
      if (user?.id) {
        setIsLoadingPosts(true);
        promises.push(
          getPostsAction({
            user_id: user.id,
            category: selectedCategory === "all" ? undefined : (selectedCategory as "gold_trade" | "gold_news" | "qna"),
            page: 1,
            page_size: 50,
            sort_by: "created_at",
            sort_order: "desc",
          }).then(result => ({ type: "posts", result }))
        );
      }

      // 2. 매장 정보 불러오기 (admin만)
      if (isAdmin && tokens?.access_token) {
        setIsLoadingMyStore(true);
        promises.push(
          getMyStoreAction(tokens.access_token).then(result => ({ type: "store", result }))
        );
      }

      // 3. 알림 설정 불러오기 (admin만)
      if (isAdmin && tokens?.access_token) {
        setIsLoadingSettings(true);
        promises.push(
          getNotificationSettingsAction(tokens.access_token).then(result => ({ type: "settings", result }))
        );
      }

      // 4. 좋아요한 매장 불러오기 (일반 사용자만)
      if (!isAdmin && tokens?.access_token) {
        setIsLoadingStores(true);
        promises.push(
          getUserLikedStoresAction(tokens.access_token).then(result => ({ type: "likedStores", result }))
        );
      }

      // 병렬로 모든 API 호출 (각 실패를 독립적으로 처리)
      const results = await Promise.allSettled(promises);

      // 컴포넌트가 unmount되었으면 state 업데이트하지 않음
      if (!isMounted) return;

      results.forEach((promiseResult, index) => {
        if (promiseResult.status === "rejected") {
          console.error("API call failed:", promiseResult.reason);
          return;
        }

        const { type, result } = promiseResult.value;

        if (type === "posts") {
          if (result.success && result.data) {
            setMyPosts(result.data.data);
            setTotalPosts(result.data.total);
          }
          setIsLoadingPosts(false);
        } else if (type === "store") {
          if (result.success && result.data?.store) {
            setMyStore(result.data.store);
          }
          setIsLoadingMyStore(false);
        } else if (type === "settings") {
          if (result.success && result.data?.settings) {
            const settings = {
              ...result.data.settings,
              selected_regions: result.data.settings.selected_regions || [],
            };
            setNotificationSettings(settings);
          }
          setIsLoadingSettings(false);
        } else if (type === "likedStores") {
          if (result.success && result.data) {
            setLikedStores(result.data.stores);
            setTotalLikedStores(result.data.count || result.data.stores.length);
          }
          setIsLoadingStores(false);
        }
      });
    };

    fetchAllData();

    // Cleanup: unmount시 isMounted 플래그 해제
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, isAdmin, user?.id, tokens?.access_token, selectedCategory]);

  // 지역 추가
  const addRegion = () => {
    if (!notificationSettings || !selectedRegion || !selectedDistrict) return;

    const locationStr = `${selectedRegion} ${selectedDistrict}`;
    const currentSelections = notificationSettings.selected_regions || [];

    // 이미 선택된 지역인지 확인
    if (currentSelections.includes(locationStr)) {
      toast.error("이미 선택된 지역입니다.");
      return;
    }

    setNotificationSettings({
      ...notificationSettings,
      selected_regions: [...currentSelections, locationStr],
    });

    // 선택 초기화
    setSelectedRegion("");
    setSelectedDistrict("");
    toast.success(`${locationStr} 추가되었습니다.`);
  };

  // 지역 제거
  const removeRegion = (location: string) => {
    if (!notificationSettings) return;

    const currentSelections = notificationSettings.selected_regions || [];
    setNotificationSettings({
      ...notificationSettings,
      selected_regions: currentSelections.filter((loc) => loc !== location),
    });
  };

  // 알림 설정 저장
  const handleSaveNotificationSettings = async () => {
    if (!notificationSettings || !tokens?.access_token) return;

    setIsSavingSettings(true);
    try {
      const result = await updateNotificationSettingsAction(
        notificationSettings,
        tokens.access_token
      );

      if (result.success && result.data?.settings) {
        // selected_regions가 없으면 빈 배열로 초기화
        const settings = {
          ...result.data.settings,
          selected_regions: result.data.settings.selected_regions || [],
        };
        setNotificationSettings(settings);
        toast.success("알림 설정이 저장되었습니다.");
      } else {
        toast.error(result.error || "알림 설정 저장에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to save notification settings:", error);
      toast.error("알림 설정 저장에 실패했습니다.");
    } finally {
      setIsSavingSettings(false);
    }
  };

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

  // 프로필 이미지 업로드 핸들러
  const handleProfileImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tokens?.access_token) return;

    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("파일 크기는 5MB 이하여야 합니다.");
      return;
    }

    // 이미지 파일 타입 체크
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드 가능합니다.");
      return;
    }

    setIsUploadingImage(true);
    const loadingToast = toast.loading("프로필 이미지 업로드 중...");

    try {
      // 1. Presigned URL 가져오기
      const presignedResult = await getPresignedUrlAction(
        {
          filename: file.name,
          content_type: file.type,
          file_size: file.size,
        },
        tokens.access_token
      );

      if (!presignedResult.success || !presignedResult.data) {
        throw new Error(presignedResult.error || "Presigned URL 생성 실패");
      }

      const { upload_url, file_url } = presignedResult.data;

      // 2. S3에 파일 업로드
      const uploadResult = await uploadToS3(upload_url, file);

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "파일 업로드 실패");
      }

      // 3. 프로필 업데이트
      const updateResult = await updateProfileAction(
        {
          name: user?.name || "",
          phone: user?.phone,
          address: user?.address,
          profile_image: file_url,
        },
        tokens.access_token
      );

      if (!updateResult.success || !updateResult.data) {
        throw new Error(updateResult.error || "프로필 업데이트 실패");
      }

      // 4. 상태 업데이트
      updateUser(updateResult.data.user);
      toast.success("프로필 이미지가 변경되었습니다.", { id: loadingToast });
    } catch (error) {
      console.error("Profile image upload error:", error);
      toast.error(error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.", {
        id: loadingToast,
      });
    } finally {
      setIsUploadingImage(false);
      // input 값 초기화 (같은 파일 재선택 가능하도록)
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="flex-grow py-8 bg-white">
      <Container className="max-w-5xl">
        {/* 프로필 헤더 + 활동 통계 */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-6 md:p-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* 프로필 이미지 */}
              <div className="relative group">
                {isAdmin ? (
                  // 매장 관리자: 매장 이미지 표시, 수정 불가
                  <Avatar className="w-24 h-24 border-4 border-gray-100">
                    {myStore?.image_url ? (
                      <AvatarImage src={myStore.image_url} alt={myStore.name} />
                    ) : null}
                    <AvatarFallback className="bg-gradient-to-br from-[#C9A227] to-[#8A6A00] text-white text-2xl">
                      {myStore?.name?.charAt(0) || user?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  // 일반 사용자: 프로필 이미지 표시, 수정 가능
                  <>
                    <Avatar
                      className="w-24 h-24 border-4 border-gray-100 cursor-pointer transition-opacity hover:opacity-80"
                      onClick={handleProfileImageClick}
                    >
                      {user?.profile_image ? (
                        <AvatarImage src={user.profile_image} alt={user.name} />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-br from-[#C9A227] to-[#8A6A00] text-white text-2xl">
                        {user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {/* 카메라 아이콘 오버레이 */}
                    <div
                      className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={handleProfileImageClick}
                    >
                      {isUploadingImage ? (
                        <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Camera className="w-8 h-8 text-white" />
                      )}
                    </div>
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfileImageChange}
                      disabled={isUploadingImage}
                    />
                  </>
                )}
              </div>

              {/* 프로필 정보 + 활동 통계 */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl font-bold text-gray-900 mb-3">{user?.name || "사용자"}</h1>
                {/* 연락처 정보 */}
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{user?.email}</span>
                  </div>
                  {user?.phone && (
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                </div>
                {/* 활동 통계 */}
                <div className="flex items-center justify-center md:justify-start gap-6 mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-8 text-gray-600" />
                    <span className="text-sm text-gray-600">
                      작성한 글 <span className="font-bold text-gray-900">{totalPosts}</span>
                    </span>
                  </div>
                  {!isAdmin && (
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-600">
                        관심 매장 <span className="font-bold text-gray-900">{totalLikedStores}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex flex-col gap-2 w-full md:w-auto">
                {isAdmin && (
                  <Button
                    variant="outline"
                    onClick={() => router.push("/mystore")}
                    className="gap-2"
                  >
                    <Store className="w-4 h-4" />
                    내 매장 관리
                  </Button>
                )}
                <Button
                  variant="brand-primary"
                  onClick={() => router.push("/mypage/edit")}
                  className="gap-2"
                >
                  <Edit className="w-4 h-4" />
                  프로필 수정
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  로그아웃
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 탭 컨텐츠 */}
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="info">회원정보</TabsTrigger>
            <TabsTrigger value="stores">
              {isAdmin ? "내 매장" : "관심 매장"}
            </TabsTrigger>
            <TabsTrigger value="posts">작성한 글</TabsTrigger>
          </TabsList>

          {/* 회원정보 탭 */}
          <TabsContent value="info">
            <Card className="border-0 shadow-sm mb-4">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <User className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-1">이름</p>
                      <p className="font-semibold text-gray-900">{user?.name || "-"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <User className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-1">닉네임</p>
                      <p className="font-semibold text-gray-900">{user?.nickname || "-"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <Mail className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-1">이메일</p>
                      <p className="font-semibold text-gray-900">{user?.email || "-"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <Phone className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-1">전화번호</p>
                      <p className="font-semibold text-gray-900">{user?.phone || "-"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-1">주소</p>
                      <p className="font-semibold text-gray-900">{user?.address || "-"}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 알림 설정 (Admin 전용) */}
            {isAdmin && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Bell className="w-5 h-5 text-gray-700" />
                      <h3 className="text-lg font-bold text-gray-900">알림 설정</h3>
                    </div>
                    {notificationSettings && (
                      <Button
                        onClick={handleSaveNotificationSettings}
                        disabled={isSavingSettings}
                        size="sm"
                        className="bg-gray-900 hover:bg-gray-800 text-white"
                      >
                        {isSavingSettings ? "저장 중..." : "저장"}
                      </Button>
                    )}
                  </div>

                  {isLoadingSettings ? (
                    <div className="text-center py-8">
                      <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">설정 불러오는 중...</p>
                    </div>
                  ) : !notificationSettings ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-600">알림 설정을 불러올 수 없습니다.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* 금 판매글 알림 */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">
                              📢 금 판매글 알림
                            </h4>
                            <p className="text-sm text-gray-600">
                              설정한 지역에 금 판매글이 올라오면 알림을 받습니다
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer ml-4">
                            <input
                              type="checkbox"
                              checked={notificationSettings.sell_post_notification}
                              onChange={(e) =>
                                setNotificationSettings({
                                  ...notificationSettings,
                                  sell_post_notification: e.target.checked,
                                })
                              }
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-700"></div>
                          </label>
                        </div>

                        {notificationSettings.sell_post_notification && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-sm text-gray-700 mb-3 font-medium">
                              알림 받을 지역 선택
                            </p>

                            {/* 지역 선택 드롭다운 */}
                            <div className="flex gap-2 mb-3">
                              <select
                                value={selectedRegion}
                                onChange={(e) => {
                                  setSelectedRegion(e.target.value);
                                  setSelectedDistrict("");
                                }}
                                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">시/도 선택</option>
                                {KOREA_REGIONS.map(({ region }) => (
                                  <option key={region} value={region}>
                                    {region}
                                  </option>
                                ))}
                              </select>

                              <select
                                value={selectedDistrict}
                                onChange={(e) => setSelectedDistrict(e.target.value)}
                                disabled={!selectedRegion}
                                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                              >
                                <option value="">구/군 선택</option>
                                {selectedRegion &&
                                  KOREA_REGIONS.find((r) => r.region === selectedRegion)?.districts.map(
                                    (district) => (
                                      <option key={district} value={district}>
                                        {district}
                                      </option>
                                    )
                                  )}
                              </select>

                              <Button
                                onClick={addRegion}
                                disabled={!selectedRegion || !selectedDistrict}
                                size="sm"
                                className="px-4 bg-gray-900 hover:bg-gray-800 text-white"
                              >
                                추가
                              </Button>
                            </div>

                            {/* 선택된 지역 목록 */}
                            {(notificationSettings.selected_regions || []).length > 0 ? (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-xs text-gray-600 mb-2">
                                  선택된 지역 ({notificationSettings.selected_regions.length}개)
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {notificationSettings.selected_regions.map((location) => (
                                    <Badge
                                      key={location}
                                      variant="secondary"
                                      className="text-xs pr-1 flex items-center gap-1"
                                    >
                                      {location}
                                      <button
                                        onClick={() => removeRegion(location)}
                                        className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500 text-center py-3 bg-gray-50 rounded">
                                알림을 받을 지역을 선택해주세요
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 댓글 알림 */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">
                              💭 댓글 알림
                            </h4>
                            <p className="text-sm text-gray-600">
                              내 게시글에 댓글이 달리면 알림을 받습니다
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer ml-4">
                            <input
                              type="checkbox"
                              checked={notificationSettings.comment_notification}
                              onChange={(e) =>
                                setNotificationSettings({
                                  ...notificationSettings,
                                  comment_notification: e.target.checked,
                                })
                              }
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-700"></div>
                          </label>
                        </div>
                      </div>

                      {/* 매장 찜 알림 */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">
                              ❤️ 매장 찜 알림
                            </h4>
                            <p className="text-sm text-gray-600">
                              누군가 내 매장을 찜하면 알림을 받습니다
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer ml-4">
                            <input
                              type="checkbox"
                              checked={notificationSettings.like_notification}
                              onChange={(e) =>
                                setNotificationSettings({
                                  ...notificationSettings,
                                  like_notification: e.target.checked,
                                })
                              }
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-700"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 매장 탭 (admin: 내 매장, 일반: 관심 매장) */}
          <TabsContent value="stores">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                {isAdmin ? (
                  // Admin - 내 매장 정보
                  <>
                    {isLoadingMyStore ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                        <p className="text-sm text-gray-500">매장 정보를 불러오는 중...</p>
                      </div>
                    ) : !myStore ? (
                      <div className="text-center py-12">
                        <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          등록된 매장이 없습니다
                        </h3>
                        <p className="text-sm text-gray-600 mb-6">
                          매장을 등록하고 관리를 시작해보세요
                        </p>
                        <Link href="/mystore">
                          <Button variant="brand-primary">
                            매장 등록하기
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* 매장 요약 카드 */}
                        <div className="p-6 bg-gradient-to-br from-[#FEF9E7] to-orange-50 rounded-xl border border-[#C9A227]/30">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center overflow-hidden border border-gray-200">
                                {myStore.image_url ? (
                                  <Image
                                    src={myStore.image_url}
                                    alt={myStore.name}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Store className="w-6 h-6 text-gray-400" />
                                )}
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-gray-900">{myStore.name}</h3>
                                <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                  <MapPin className="w-3 h-3" />
                                  {myStore.region && myStore.district
                                    ? `${myStore.region} ${myStore.district}`
                                    : myStore.address || "주소 정보 없음"}
                                </p>
                              </div>
                            </div>
                            <Link href="/mystore">
                              <Button variant="outline" size="sm">
                                매장 수정
                              </Button>
                            </Link>
                          </div>

                          {/* 전체 주소 */}
                          {myStore.address && (
                            <div className="bg-white/50 p-4 rounded-lg mb-4">
                              <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <span className="text-xs text-gray-600 block mb-1">주소</span>
                                  <p className="text-sm font-medium text-gray-900">{myStore.address}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 매장 상세 정보 */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white p-4 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <Phone className="w-4 h-4 text-gray-500" />
                                <span className="text-xs text-gray-600">연락처</span>
                              </div>
                              <p className="text-sm font-semibold text-gray-900">
                                {myStore.phone_number || "미설정"}
                              </p>
                            </div>
                            <div className="bg-white p-4 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span className="text-xs text-gray-600">영업시간</span>
                              </div>
                              <p className="text-sm font-semibold text-gray-900">
                                {myStore.business_hours ||
                                 (myStore.open_time && myStore.close_time
                                   ? `${myStore.open_time} - ${myStore.close_time}`
                                   : "미설정")}
                              </p>
                            </div>
                          </div>

                          {/* 매장 소개 */}
                          {myStore.description && (
                            <div className="bg-white/50 p-4 rounded-lg mt-4">
                              <span className="text-xs text-gray-600 block mb-2">매장 소개</span>
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {myStore.description}
                              </p>
                            </div>
                          )}

                          {/* 태그 */}
                          {myStore.tags && myStore.tags.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {myStore.tags.map((tag) => (
                                <Badge key={tag.id} variant="secondary" className="bg-white">
                                  {tag.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* 관리 버튼 */}
                        <div className="flex gap-3">
                          <Link href="/mystore" className="flex-1">
                            <Button variant="brand-primary" className="w-full">
                              <Edit className="w-4 h-4 mr-2" />
                              매장 정보 수정
                            </Button>
                          </Link>
                          <Link href={`/stores/${myStore.id}/${myStore.slug}`} className="flex-1">
                            <Button variant="outline" className="w-full">
                              <Eye className="w-4 h-4 mr-2" />
                              매장 페이지 보기
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  // 일반 사용자 - 관심 매장
                  <>
                    {isLoadingStores ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                        <p className="text-sm text-gray-500">매장 목록을 불러오는 중...</p>
                      </div>
                    ) : likedStores.length === 0 ? (
                      <div className="text-center py-12">
                        <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          좋아요한 매장이 없습니다
                        </h3>
                        <p className="text-sm text-gray-600 mb-6">
                          마음에 드는 매장을 찾아 좋아요를 눌러보세요
                        </p>
                        <Link href="/stores">
                          <Button variant="outline">
                            매장 둘러보기
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {likedStores.map((store) => (
                          <Link key={store.id} href={`/stores/${store.id}/${store.slug}`}>
                            <div className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                              <div className="flex items-start gap-3">
                                <div className="w-16 h-16 bg-[#FEF9E7] border border-[#C9A227]/20 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                                  {store.image_url ? (
                                    <img
                                      src={store.image_url}
                                      alt={store.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Store className="w-8 h-8 text-[#C9A227]" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-gray-900 mb-1 truncate">{store.name}</h4>
                                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                                    <MapPin className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">
                                      {store.region && store.district
                                        ? `${store.region} ${store.district}`
                                        : store.address || "주소 정보 없음"}
                                    </span>
                                  </div>
                                  {store.tags && store.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {store.tags.slice(0, 3).map((tag) => (
                                        <Badge key={tag.id} variant="secondary" className="text-xs">
                                          {tag.name}
                                        </Badge>
                                      ))}
                                      {store.tags.length > 3 && (
                                        <Badge variant="secondary" className="text-xs">
                                          +{store.tags.length - 3}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <Heart className="w-5 h-5 text-red-500 fill-red-500 flex-shrink-0" />
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 작성한 글 탭 */}
          <TabsContent value="posts">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                {/* 카테고리 필터 */}
                <div className="flex items-center gap-2 mb-4 pb-4 border-b overflow-x-auto">
                  <Button
                    variant={selectedCategory === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory("all")}
                    className={selectedCategory === "all" ? "bg-gray-900 hover:bg-gray-800 text-white" : ""}
                  >
                    전체 ({totalPosts})
                  </Button>
                  <Button
                    variant={selectedCategory === "gold_trade" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory("gold_trade")}
                    className={selectedCategory === "gold_trade" ? "bg-gray-900 hover:bg-gray-800 text-white" : ""}
                  >
                    금거래
                  </Button>
                  <Button
                    variant={selectedCategory === "gold_news" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory("gold_news")}
                    className={selectedCategory === "gold_news" ? "bg-gray-900 hover:bg-gray-800 text-white" : ""}
                  >
                    금소식
                  </Button>
                  <Button
                    variant={selectedCategory === "qna" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory("qna")}
                    className={selectedCategory === "qna" ? "bg-gray-900 hover:bg-gray-800 text-white" : ""}
                  >
                    QnA
                  </Button>
                </div>

                {isLoadingPosts ? (
                  <div className="text-center py-page">
                    <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
                    <p className="text-gray-500 text-sm mt-4">게시글 불러오는 중...</p>
                  </div>
                ) : myPosts.length === 0 ? (
                  <div className="text-center py-page">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {selectedCategory === "all" ? "작성한 글이 없습니다" : "이 카테고리에 작성한 글이 없습니다"}
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">
                      커뮤니티에서 첫 글을 작성해보세요
                    </p>
                    <Link href="/community">
                      <Button variant="outline">
                        커뮤니티 가기
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <Virtuoso
                    data={myPosts}
                    style={{ height: "600px" }}
                    itemContent={(index, post) => (
                      <Link
                        key={post.id}
                        href={`/community/posts/${post.id}`}
                        className="block p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors mb-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary" className="text-xs">
                                {post.category === "gold_trade" ? "금거래" : post.category === "gold_news" ? "금소식" : "QnA"}
                              </Badge>
                              {post.status !== "active" && (
                                <Badge variant="outline" className="text-xs">
                                  {post.status === "inactive" ? "비활성" : "삭제됨"}
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-2 truncate">
                              {post.title}
                            </h3>
                            <div className="flex items-center gap-4 text-xs text-gray-600">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(post.created_at).toLocaleDateString("ko-KR")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {post.view_count}
                              </span>
                              <span className="flex items-center gap-1">
                                <ThumbsUp className="w-3 h-3" />
                                {post.like_count}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                {post.comment_count}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    )}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Container>
    </main>
  );
}
