"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
import type { CommunityPost } from "@/types/community";
import { toast } from "sonner";

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

  // 좋아요한 매장 상태 (API 없음 - 추후 구현)
  const [likedStores] = useState([]);
  const totalLikedStores = 0;

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // 작성한 글 불러오기
  useEffect(() => {
    const fetchMyPosts = async () => {
      if (!user?.id) return;

      setIsLoadingPosts(true);
      try {
        const result = await getPostsAction({
          user_id: user.id,
          category: selectedCategory === "all" ? undefined : (selectedCategory as "gold_trade" | "gold_news" | "qna"),
          page: 1,
          page_size: 50,
          sort_by: "created_at",
          sort_order: "desc",
        });

        if (result.success && result.data) {
          setMyPosts(result.data.data);
          setTotalPosts(result.data.total);
        }
      } catch (error) {
        console.error("Failed to fetch posts:", error);
      } finally {
        setIsLoadingPosts(false);
      }
    };

    if (isAuthenticated && user) {
      fetchMyPosts();
    }
  }, [isAuthenticated, user, selectedCategory]);

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
    <main className="flex-grow py-8 bg-gray-50">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* 프로필 헤더 + 활동 통계 */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* 프로필 이미지 */}
              <div className="relative group">
                <Avatar
                  className="w-24 h-24 border-4 border-gray-100 cursor-pointer transition-opacity hover:opacity-80"
                  onClick={handleProfileImageClick}
                >
                  {user?.profile_image ? (
                    <AvatarImage src={user.profile_image} alt={user.name} />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-white text-2xl">
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
              </div>

              {/* 프로필 정보 + 활동 통계 */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl font-bold text-gray-900 mb-3">{user?.name || "사용자"}</h1>

                {/* 활동 통계 */}
                <div className="flex items-center justify-center md:justify-start gap-6 mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-600">
                      작성한 글 <span className="font-bold text-gray-900">{totalPosts}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-600">
                      좋아요 매장 <span className="font-bold text-gray-900">{totalLikedStores}</span>
                    </span>
                  </div>
                </div>

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
              </div>

              {/* 액션 버튼 */}
              <div className="flex flex-col gap-2 w-full md:w-auto">
                <Button
                  variant="outline"
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
            <TabsTrigger value="stores">좋아요한 매장</TabsTrigger>
            <TabsTrigger value="posts">작성한 글</TabsTrigger>
          </TabsList>

          {/* 회원정보 탭 */}
          <TabsContent value="info">
            <Card className="border-0 shadow-sm">
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
          </TabsContent>

          {/* 좋아요한 매장 탭 */}
          <TabsContent value="stores">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                {likedStores.length === 0 ? (
                  <div className="text-center py-12">
                    <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      좋아요한 매장이 없습니다
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">
                      마음에 드는 매장을 찾아 좋아요를 눌러보세요
                    </p>
                    <Link href="/stores">
                      <Button className="bg-gray-900 hover:bg-gray-800">
                        매장 둘러보기
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 좋아요한 매장 목록 - 추후 API 연동 */}
                  </div>
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
                    className={selectedCategory === "all" ? "bg-gray-900 hover:bg-gray-800" : ""}
                  >
                    전체 ({totalPosts})
                  </Button>
                  <Button
                    variant={selectedCategory === "gold_trade" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory("gold_trade")}
                    className={selectedCategory === "gold_trade" ? "bg-gray-900 hover:bg-gray-800" : ""}
                  >
                    금거래
                  </Button>
                  <Button
                    variant={selectedCategory === "gold_news" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory("gold_news")}
                    className={selectedCategory === "gold_news" ? "bg-gray-900 hover:bg-gray-800" : ""}
                  >
                    금소식
                  </Button>
                  <Button
                    variant={selectedCategory === "qna" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory("qna")}
                    className={selectedCategory === "qna" ? "bg-gray-900 hover:bg-gray-800" : ""}
                  >
                    QnA
                  </Button>
                </div>

                {isLoadingPosts ? (
                  <div className="text-center py-12">
                    <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
                    <p className="text-gray-500 text-sm mt-4">게시글 불러오는 중...</p>
                  </div>
                ) : myPosts.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {selectedCategory === "all" ? "작성한 글이 없습니다" : "이 카테고리에 작성한 글이 없습니다"}
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">
                      커뮤니티에서 첫 글을 작성해보세요
                    </p>
                    <Link href="/community">
                      <Button className="bg-gray-900 hover:bg-gray-800">
                        커뮤니티 가기
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myPosts.map((post) => (
                      <Link
                        key={post.id}
                        href={`/community/posts/${post.id}`}
                        className="block p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
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
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
