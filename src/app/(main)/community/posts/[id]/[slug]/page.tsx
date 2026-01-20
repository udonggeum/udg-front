"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getPostDetailAction,
  togglePostLikeAction,
  deletePostAction,
  createCommentAction,
  updateCommentAction,
  toggleCommentLikeAction,
  deleteCommentAction,
  acceptAnswerAction,
} from "@/actions/community";
import { createChatRoomAction } from "@/actions/chat";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  type PostDetailResponse,
  type CommunityComment,
} from "@/types/community";
import { toast } from "sonner";
import { getUserDisplayName, getUserImageUrl } from "@/lib/utils";
import {
  MessageCircle,
  MoreVertical,
  Heart,
  MapPin,
  Store,
  Phone,
  ChevronLeft,
  ChevronRight,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostDetailSkeleton } from "@/components/skeletons/PostDetailSkeleton";
import Image from "next/image";

export default function CommunityDetailPage() {
  const params = useParams();
  // slug는 SEO용이므로 params.slug를 받지만 실제 조회는 id로 수행
  const router = useRouter();
  const { user, tokens } = useAuthStore();

  const [post, setPost] = useState<PostDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [showMenu, setShowMenu] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const postId = Number(params?.id);

  // 페이지 진입 시 스크롤 맨 위로
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [postId]);

  // 게시글 데이터 로드
  useEffect(() => {
    const fetchPost = async () => {
      setIsLoading(true);
      setError(null);

      const result = await getPostDetailAction(
        postId,
        tokens?.access_token
      );

      if (result.success && result.data) {
        setPost(result.data);
      } else {
        setError(result.error || "게시글을 불러오는데 실패했습니다.");
      }

      setIsLoading(false);
    };

    if (postId) {
      fetchPost();
    }
  }, [postId, tokens?.access_token]);

  const handleLike = async () => {
    if (!tokens?.access_token) return;

    const result = await togglePostLikeAction(postId, tokens.access_token);
    if (result.success && post) {
      const updatedPost = {
        ...post,
        is_liked: result.data?.is_liked || false,
        data: {
          ...post.data,
          like_count: result.data?.is_liked
            ? post.data.like_count + 1
            : post.data.like_count - 1,
        },
      };
      setPost(updatedPost);
    }
  };

  const handleDelete = async () => {
    if (!tokens?.access_token) return;
    if (!confirm("정말 삭제하시겠습니까?")) return;

    const result = await deletePostAction(postId, tokens.access_token);
    if (result.success) {
      router.push("/community");
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || !tokens?.access_token) return;

    const result = await createCommentAction(
      {
        content: commentContent,
        post_id: postId,
        parent_id: replyTo || undefined,
        is_answer: post?.data.category === "qna",
      },
      tokens.access_token
    );

    if (result.success) {
      const parentCommentId = replyTo;
      setCommentContent("");
      setReplyTo(null);
      const updatedPost = await getPostDetailAction(
        postId,
        tokens.access_token
      );
      if (updatedPost.success && updatedPost.data) {
        setPost(updatedPost.data);
        // 답글을 작성했으면 자동으로 펼치기
        if (parentCommentId) {
          setExpandedComments((prev) => new Set(prev).add(parentCommentId));
        }
      }
      toast.success(parentCommentId ? "답글이 작성되었습니다." : "댓글이 작성되었습니다.");
    } else {
      toast.error(result.error || "댓글 작성에 실패했습니다.");
    }
  };

  const handleCommentLike = async (commentId: number) => {
    if (!tokens?.access_token) return;

    await toggleCommentLikeAction(commentId, tokens.access_token);
    const updatedPost = await getPostDetailAction(postId, tokens.access_token);
    if (updatedPost.success && updatedPost.data) {
      setPost(updatedPost.data);
    }
  };

  const toggleCommentExpand = (commentId: number) => {
    setExpandedComments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const handleCommentEdit = (commentId: number, currentContent: string) => {
    setEditingCommentId(commentId);
    setEditingContent(currentContent);
    setReplyTo(null); // 답글 작성 중이면 취소
  };

  const handleCommentUpdate = async (commentId: number) => {
    if (!editingContent.trim() || !tokens?.access_token) return;

    const result = await updateCommentAction(
      commentId,
      { content: editingContent },
      tokens.access_token
    );

    if (result.success) {
      setEditingCommentId(null);
      setEditingContent("");
      const updatedPost = await getPostDetailAction(
        postId,
        tokens.access_token
      );
      if (updatedPost.success && updatedPost.data) {
        setPost(updatedPost.data);
      }
      toast.success("댓글이 수정되었습니다.");
    } else {
      toast.error(result.error || "댓글 수정에 실패했습니다.");
    }
  };

  const handleCommentDelete = async (commentId: number) => {
    if (!tokens?.access_token) return;
    if (!confirm("댓글을 삭제하시겠습니까?")) return;

    const result = await deleteCommentAction(commentId, tokens.access_token);
    if (result.success) {
      const updatedPost = await getPostDetailAction(
        postId,
        tokens.access_token
      );
      if (updatedPost.success && updatedPost.data) {
        setPost(updatedPost.data);
      }
      toast.success("댓글이 삭제되었습니다.");
    } else {
      toast.error(result.error || "댓글 삭제에 실패했습니다.");
    }
  };

  const handleAcceptAnswer = async (commentId: number) => {
    if (!tokens?.access_token) return;
    if (!confirm("이 답변을 채택하시겠습니까?")) return;

    const result = await acceptAnswerAction(
      postId,
      commentId,
      tokens.access_token
    );
    if (result.success) {
      const updatedPost = await getPostDetailAction(
        postId,
        tokens.access_token
      );
      if (updatedPost.success && updatedPost.data) {
        setPost(updatedPost.data);
      }
    }
  };

  // 판매자에게 문의하기
  const handleContactSeller = async () => {
    if (!user || !tokens?.access_token) {
      toast.error("로그인이 필요합니다.");
      router.push("/login");
      return;
    }

    if (!postData) {
      toast.error("게시글 정보를 불러올 수 없습니다.");
      return;
    }

    if (user.id === postData.user_id) {
      toast.error("자신의 게시글에는 문의할 수 없습니다.");
      return;
    }

    const loadingToast = toast.loading("대화방을 생성하는 중...");

    try {
      const chatRoomType = postData.type === 'sell_gold' ? 'SELL_GOLD' :
                           postData.type === 'buy_gold' ? 'BUY_GOLD' : 'SALE';

      const result = await createChatRoomAction(
        {
          target_user_id: postData.user_id,
          type: chatRoomType as "SELL_GOLD" | "BUY_GOLD" | "STORE" | "SALE",
          product_id: postData.id,
        },
        tokens.access_token
      );

      if (result.success && result.data) {
        toast.success(
          result.data.is_new ? "새 대화방이 생성되었습니다." : "대화방으로 이동합니다.",
          { id: loadingToast }
        );
        router.push(`/chats/${result.data.room.id}`);
      } else {
        toast.error(result.error || "대화방 생성에 실패했습니다.", { id: loadingToast });
      }
    } catch (error) {
      console.error("Create chat room error:", error);
      toast.error("대화방 생성 중 오류가 발생했습니다.", { id: loadingToast });
    }
  };

  if (isLoading) {
    return <PostDetailSkeleton />;
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl max-w-md">
          <span>게시글을 찾을 수 없습니다.</span>
        </div>
      </div>
    );
  }

  const postData = post.data;
  const isAuthor = user?.id === postData.user_id;
  const canEdit = isAuthor;

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header - 모바일에서만 표시 */}
      <div className="sm:hidden bg-white border-b border-gray-200 sticky top-[60px] z-40">
        <div className="max-w-[900px] mx-auto px-page py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {canEdit && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20">
                    <Link
                      href={`/community/edit/${postData.id}`}
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setShowMenu(false)}
                    >
                      수정
                    </Link>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        handleDelete();
                      }}
                      className="block w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-gray-50 transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-page py-6">
        {/* 상태 뱃지 */}
        {postData.type === 'sell_gold' && postData.reservation_status && (
          <div className="mb-4">
            {postData.reservation_status === 'reserved' ? (
              <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#FEF9E7] to-[#FDF8E8] border border-[#C9A227]/30 text-[#8A6A00] text-sm font-bold rounded-full">
                🔒 예약중 - {postData.reserved_by_user?.name || '구매자'}님과 거래 예정
              </span>
            ) : postData.reservation_status === 'completed' ? (
              <span className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-600 text-sm font-bold rounded-full">
                ✅ 거래완료
              </span>
            ) : null}
          </div>
        )}

        {/* Category Breadcrumb */}
        <div className="flex items-center gap-2 mb-3 text-sm">
          <Link
            href="/community"
            className="text-gray-500 hover:text-gray-900 transition-colors"
          >
            {postData.category === 'gold_trade' ? '금시장' :
             postData.category === 'gold_news' ? '금소식' :
             postData.category === 'qna' ? 'Q&A' : '커뮤니티'}
          </Link>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-[#8A6A00] font-semibold">
            {postData.type === 'buy_gold' ? '금 구매' :
             postData.type === 'sell_gold' ? '금 판매' :
             postData.type === 'product_news' ? '상품소식' :
             postData.type === 'store_news' ? '매장소식' :
             postData.type === 'question' ? '질문' :
             postData.type === 'faq' ? 'FAQ' : '기타'}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-[28px] sm:text-[32px] font-bold text-gray-900 mb-4 leading-tight">
          {postData.title}
        </h1>

        {/* Author Info */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ${
                getUserImageUrl(postData.user)
                  ? "bg-white border border-gray-200"
                  : "bg-gradient-to-br from-[#C9A227] to-[#8A6A00]"
              }`}>
                {getUserImageUrl(postData.user) ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={getUserImageUrl(postData.user) || ''}
                      alt={getUserDisplayName(postData.user)}
                      fill
                      className="object-cover"
                      sizes="40px"
                      quality={80}
                    />
                  </div>
                ) : (
                  <span className="text-lg font-bold text-white">
                    {getUserDisplayName(postData.user).charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <div className="font-semibold text-gray-900">
                  {getUserDisplayName(postData.user)}
                </div>
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <span>{new Date(postData.created_at).toLocaleString()}</span>
                  <span>·</span>
                  <span>조회 {postData.view_count}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Like Button */}
              <button
                onClick={handleLike}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all ${
                  post.is_liked
                    ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                    : "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
                }`}
                disabled={!user}
              >
                <Heart className={`w-5 h-5 ${post.is_liked ? 'fill-current' : ''}`} />
                <span>{postData.like_count}</span>
              </button>

              {/* 웹에서만 표시되는 수정/삭제 메뉴 */}
              {canEdit && (
                <div className="relative hidden sm:block">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {showMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20">
                        <Link
                          href={`/community/edit/${postData.id}`}
                          className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setShowMenu(false)}
                        >
                          수정
                        </Link>
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            handleDelete();
                          }}
                          className="block w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-gray-50 transition-colors"
                        >
                          삭제
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 금 거래 정보 - 프로필 아래 인라인 표시 */}
          {postData.category === "gold_trade" && (
            <div className="flex flex-wrap gap-3 text-sm">
              {postData.gold_type && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">금 종류</span>
                  <span className="font-semibold text-gray-900">{postData.gold_type}</span>
                </div>
              )}
              {postData.weight && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">중량</span>
                  <span className="font-semibold text-gray-900">{postData.weight}g</span>
                </div>
              )}
              {postData.price !== undefined && postData.price !== null && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">가격</span>
                  <span className="font-semibold text-[#C9A227]">
                    {postData.price > 0 ? `${postData.price.toLocaleString()}원` : '문의'}
                  </span>
                </div>
              )}
              {postData.location && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg">
                  <MapPin className="w-3.5 h-3.5 text-gray-600" />
                  <span className="font-semibold text-gray-900">{postData.location}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 이미지 갤러리 */}
        {postData.image_urls && postData.image_urls.length > 0 && (
          <div className="mb-6">
            <div className="relative bg-white border border-gray-200 rounded-2xl overflow-hidden aspect-video">
              <Image
                src={postData.image_urls[currentImageIndex]}
                alt={`이미지 ${currentImageIndex + 1}`}
                fill
                className="object-contain cursor-zoom-in"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 900px"
                quality={85}
                priority={currentImageIndex === 0}
                onClick={() => setIsImageModalOpen(true)}
              />

              {/* 이미지 개수 표시 */}
              {postData.image_urls.length > 1 && (
                <>
                  {/* 이전 버튼 */}
                  {currentImageIndex > 0 && (
                    <button
                      onClick={() => setCurrentImageIndex(prev => prev - 1)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white shadow-md rounded-full flex items-center justify-center transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6 text-gray-700" />
                    </button>
                  )}

                  {/* 다음 버튼 */}
                  {currentImageIndex < postData.image_urls.length - 1 && (
                    <button
                      onClick={() => setCurrentImageIndex(prev => prev + 1)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white shadow-md rounded-full flex items-center justify-center transition-colors"
                    >
                      <ChevronRight className="w-6 h-6 text-gray-700" />
                    </button>
                  )}

                  {/* 인디케이터 */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {postData.image_urls.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentImageIndex
                            ? "bg-[#C9A227] w-6"
                            : "bg-gray-400 hover:bg-gray-500"
                        }`}
                      />
                    ))}
                  </div>

                  {/* 이미지 카운터 */}
                  <div className="absolute top-4 right-4 px-3 py-1.5 bg-white/90 shadow-md text-gray-700 text-sm font-medium rounded-full">
                    {currentImageIndex + 1} / {postData.image_urls.length}
                  </div>
                </>
              )}
            </div>

            {/* 썸네일 */}
            {postData.image_urls.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                {postData.image_urls.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentImageIndex
                        ? "border-[#C9A227] ring-2 ring-[#C9A227]/20"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="relative w-full h-full">
                      <Image
                        src={url}
                        alt={`썸네일 ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="80px"
                        quality={70}
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 이미지 확대 모달 */}
        {isImageModalOpen && postData.image_urls && (
          <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={() => setIsImageModalOpen(false)}>
            <button
              onClick={() => setIsImageModalOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors z-10"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <Image
                src={postData.image_urls[currentImageIndex]}
                alt={`확대 이미지 ${currentImageIndex + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
                quality={90}
              />
            </div>
          </div>
        )}

        {/* 내용 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 mb-6">
          <p className="whitespace-pre-wrap text-gray-700 leading-relaxed text-[16px]">
            {postData.content}
          </p>
        </div>

        {/* 매장 정보 카드 */}
        {postData.store && (
          <div className="bg-gradient-to-r from-[#FEF9E7] to-[#FDF8E8] rounded-2xl p-5 border border-[#C9A227]/30 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[#C9A227] rounded-full flex items-center justify-center flex-shrink-0">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-600 mb-0.5">매장 정보</div>
                <div className="text-lg font-bold text-gray-900 truncate">{postData.store.name}</div>
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex gap-2">
              {/* 전화하기 - 모바일에서만 표시 */}
              {postData.store.phone_number && (
                <a
                  href={`tel:${postData.store.phone_number}`}
                  className="sm:hidden flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-[#C9A227]/30 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">전화하기</span>
                </a>
              )}

              {/* 매장으로 가기 - 웹에서만 표시 */}
              <Link
                href={`/stores/${postData.store.id}/${postData.store.slug || 'store'}`}
                className="hidden sm:flex flex-1 items-center justify-center gap-2 px-4 py-3 bg-white border border-[#C9A227]/30 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                <Store className="w-4 h-4" />
                <span className="text-sm">매장으로 가기</span>
              </Link>

              {/* 문의하기 - 작성자가 아닐 때만 표시 */}
              {!isAuthor && user && (
                <button
                  onClick={handleContactSeller}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#C9A227] text-white rounded-xl font-semibold hover:bg-[#B89120] transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm">문의하기</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 댓글 섹션 or 문의 섹션 */}
        {postData.category === "gold_trade" ? (
          /* 금거래 - 문의 버튼은 하단 고정 */
          <div className="h-4"></div>
        ) : (
          /* 금소식, QnA - 댓글 */
          <div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                💬 댓글 {postData.comment_count}
                {postData.category === "qna" && !postData.is_answered && (
                  <span className="text-sm font-normal text-gray-500">(답변 채택 대기 중)</span>
                )}
              </h2>

              {/* Comment List */}
              <div className="divide-y divide-gray-100">
                {postData.comments && postData.comments.length > 0 ? (
                  postData.comments.map((comment) => (
                    <div key={comment.id} className="py-5 first:pt-0">
                      <div className="flex gap-3">
                        {/* Profile Image */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${
                          getUserImageUrl(comment.user)
                            ? "bg-white border border-gray-200"
                            : "bg-gradient-to-br from-[#C9A227] to-[#8A6A00]"
                        }`}>
                          {getUserImageUrl(comment.user) ? (
                            <div className="relative w-full h-full">
                              <Image
                                src={getUserImageUrl(comment.user) || ''}
                                alt={getUserDisplayName(comment.user)}
                                fill
                                className="object-cover"
                                sizes="40px"
                                quality={80}
                              />
                            </div>
                          ) : (
                            <span className="text-sm font-bold text-white">
                              {getUserDisplayName(comment.user).charAt(0)}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">{getUserDisplayName(comment.user)}</span>
                            {comment.user_id === postData.user_id && (
                              <span className="px-2 py-0.5 bg-[#C9A227] text-white text-xs font-semibold rounded-full">
                                작성자
                              </span>
                            )}
                            <span className="text-xs text-gray-400">
                              {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                            {comment.is_accepted && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                ✓ 채택됨
                              </span>
                            )}
                          </div>

                          {/* Content or Edit Form */}
                          {editingCommentId === comment.id ? (
                            <div className="mb-3">
                              <textarea
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent focus:bg-white resize-none transition-all"
                                rows={3}
                                value={editingContent}
                                onChange={(e) => setEditingContent(e.target.value)}
                                autoFocus
                              />
                              <div className="flex justify-end gap-2 mt-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCommentId(null);
                                    setEditingContent("");
                                  }}
                                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
                                >
                                  취소
                                </button>
                                <Button
                                  onClick={() => handleCommentUpdate(comment.id)}
                                  variant="brand-primary"
                                  size="sm"
                                  disabled={!editingContent.trim()}
                                >
                                  수정 완료
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap text-gray-700 leading-relaxed mb-3">
                              {comment.content}
                            </p>
                          )}

                          {/* Actions */}
                          {editingCommentId !== comment.id && (
                            <div className="flex items-center gap-3">
                            {/* Like */}
                            <button
                              onClick={() => handleCommentLike(comment.id)}
                              className="flex items-center gap-1 text-sm text-gray-600 hover:text-red-600 transition-colors"
                              disabled={!user}
                            >
                              <Heart className="w-4 h-4" />
                              <span className="font-medium">{comment.like_count}</span>
                            </button>

                            {/* Reply */}
                            {user && !comment.parent_id && (
                              <button
                                onClick={() => {
                                  if (replyTo === comment.id) {
                                    setReplyTo(null);
                                  } else {
                                    setReplyTo(comment.id);
                                    // 답글 작성 시 자동으로 펼치기
                                    setExpandedComments((prev) => new Set(prev).add(comment.id));
                                  }
                                }}
                                className="flex items-center gap-1 text-sm text-gray-600 hover:text-[#C9A227] transition-colors font-medium"
                              >
                                <MessageCircle className="w-4 h-4" />
                                {replyTo === comment.id ? '취소' : '답글'}
                              </button>
                            )}

                            {/* Accept Answer */}
                            {postData.category === "qna" &&
                              !postData.is_answered &&
                              isAuthor &&
                              comment.is_answer &&
                              !comment.parent_id && (
                                <button
                                  onClick={() => handleAcceptAnswer(comment.id)}
                                  className="px-3 py-1 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors"
                                >
                                  채택하기
                                </button>
                              )}

                            {/* Edit */}
                            {user?.id === comment.user_id && (
                              <button
                                onClick={() => handleCommentEdit(comment.id, comment.content)}
                                className="text-sm text-gray-500 hover:text-[#C9A227] transition-colors font-medium"
                              >
                                수정
                              </button>
                            )}

                            {/* Delete */}
                            {(user?.id === comment.user_id || isAuthor) && (
                              <button
                                onClick={() => handleCommentDelete(comment.id)}
                                className="text-sm text-gray-500 hover:text-red-600 transition-colors font-medium"
                              >
                                삭제
                              </button>
                            )}
                          </div>
                          )}

                          {/* Toggle Replies Button */}
                          {comment.replies && comment.replies.length > 0 && (
                            <button
                              onClick={() => toggleCommentExpand(comment.id)}
                              className="flex items-center gap-1.5 text-sm text-[#C9A227] hover:text-[#B89120] font-semibold mt-2 transition-colors"
                            >
                              <MessageCircle className="w-4 h-4" />
                              {expandedComments.has(comment.id)
                                ? `답글 숨기기`
                                : `답글 ${comment.replies.length}개 보기`}
                            </button>
                          )}

                          {/* Inline Reply Form */}
                          {replyTo === comment.id && (
                            <form onSubmit={handleCommentSubmit} className="mt-4">
                              <textarea
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent focus:bg-white resize-none transition-all"
                                placeholder="답글을 입력하세요..."
                                rows={2}
                                value={commentContent}
                                onChange={(e) => setCommentContent(e.target.value)}
                                autoFocus
                              />
                              <div className="flex justify-end gap-2 mt-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyTo(null);
                                    setCommentContent("");
                                  }}
                                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
                                >
                                  취소
                                </button>
                                <Button
                                  type="submit"
                                  variant="brand-primary"
                                  size="sm"
                                  disabled={!commentContent.trim()}
                                >
                                  답글 작성
                                </Button>
                              </div>
                            </form>
                          )}

                          {/* Replies */}
                          {comment.replies && comment.replies.length > 0 && expandedComments.has(comment.id) && (
                            <div className="mt-4 space-y-4 pl-6 border-l-2 border-gray-100">
                              {comment.replies.map((reply: CommunityComment) => (
                                <div key={reply.id} className="flex gap-3">
                                  <div className="w-8 h-8 bg-gradient-to-br from-[#C9A227] to-[#8A6A00] rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-bold text-white">
                                      {reply.user.nickname.charAt(0)}
                                    </span>
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-semibold text-sm text-gray-900">{reply.user.nickname}</span>
                                      {reply.user_id === postData.user_id && (
                                        <span className="px-2 py-0.5 bg-[#C9A227] text-white text-[10px] font-semibold rounded-full">
                                          작성자
                                        </span>
                                      )}
                                      <span className="text-xs text-gray-400">
                                        {new Date(reply.created_at).toLocaleDateString()}
                                      </span>
                                    </div>

                                    {/* Content or Edit Form */}
                                    {editingCommentId === reply.id ? (
                                      <div className="mb-2">
                                        <textarea
                                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent focus:bg-white resize-none transition-all"
                                          rows={2}
                                          value={editingContent}
                                          onChange={(e) => setEditingContent(e.target.value)}
                                          autoFocus
                                        />
                                        <div className="flex justify-end gap-2 mt-2">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingCommentId(null);
                                              setEditingContent("");
                                            }}
                                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 font-medium"
                                          >
                                            취소
                                          </button>
                                          <Button
                                            onClick={() => handleCommentUpdate(reply.id)}
                                            variant="brand-primary"
                                            size="sm"
                                            disabled={!editingContent.trim()}
                                          >
                                            수정 완료
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed mb-2">
                                        {reply.content}
                                      </p>
                                    )}

                                    {editingCommentId !== reply.id && (
                                      <div className="flex items-center gap-3">
                                        <button
                                          onClick={() => handleCommentLike(reply.id)}
                                          className="flex items-center gap-1 text-sm text-gray-600 hover:text-red-600 transition-colors"
                                          disabled={!user}
                                        >
                                          <Heart className="w-3.5 h-3.5" />
                                          <span className="font-medium">{reply.like_count}</span>
                                        </button>

                                        {/* Edit */}
                                        {user?.id === reply.user_id && (
                                          <button
                                            onClick={() => handleCommentEdit(reply.id, reply.content)}
                                            className="text-sm text-gray-500 hover:text-[#C9A227] transition-colors font-medium"
                                          >
                                            수정
                                          </button>
                                        )}

                                        {/* Delete */}
                                        {(user?.id === reply.user_id || isAuthor) && (
                                          <button
                                            onClick={() => handleCommentDelete(reply.id)}
                                            className="text-sm text-gray-500 hover:text-red-600 transition-colors font-medium"
                                          >
                                            삭제
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <MessageCircle className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">아직 댓글이 없습니다</p>
                    <p className="text-sm text-gray-400 mt-1">첫 댓글을 작성해보세요!</p>
                  </div>
                )}
              </div>

              {/* Comment Form - 댓글 리스트 아래 */}
              {user && !replyTo ? (
                <form onSubmit={handleCommentSubmit} className="mt-6 pt-6 border-t border-gray-200">
                  <div className="relative">
                    <textarea
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent focus:bg-white resize-none transition-all"
                      placeholder={postData.category === "qna" ? "답변을 작성하세요..." : "댓글을 입력하세요..."}
                      rows={3}
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end mt-3">
                    <Button
                      type="submit"
                      variant="brand-primary"
                      disabled={!commentContent.trim()}
                      className="gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {postData.category === "qna" ? "답변 작성" : "댓글 작성"}
                    </Button>
                  </div>
                </form>
              ) : !user ? (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl px-6 py-4">
                    <p className="text-blue-900 font-medium">
                      💬 댓글을 작성하려면{" "}
                      <Link href="/login" className="text-blue-600 underline font-semibold hover:text-blue-700">
                        로그인
                      </Link>
                      이 필요합니다.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* 하단 고정 문의 버튼 (금거래만) */}
      {postData.category === "gold_trade" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
          <div className="max-w-[900px] mx-auto">
            {user ? (
              !isAuthor ? (
                (postData.type === 'sell_gold' && user.role === 'admin') ||
                (postData.type === 'buy_gold' && user.role === 'user') ? (
                  <Button
                    onClick={handleContactSeller}
                    variant="brand-primary"
                    size="lg"
                    className="w-full gap-2 text-lg py-4"
                  >
                    <MessageCircle className="w-5 h-5" />
                    {postData.type === 'sell_gold' ? '판매자에게 문의하기' : '매장에 문의하기'}
                  </Button>
                ) : (
                  <div className="text-center px-6 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm">
                    {postData.type === 'sell_gold'
                      ? '금 판매 문의는 매장(관리자)만 가능합니다'
                      : '금 구매 문의는 일반 사용자만 가능합니다'}
                  </div>
                )
              ) : (
                <div className="text-center px-6 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm">
                  본인이 작성한 게시글입니다
                </div>
              )
            ) : (
              <Link href="/login">
                <Button variant="brand-primary" size="lg" className="w-full gap-2 text-lg py-4">
                  로그인하고 문의하기
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
