"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getPostDetailAction,
  togglePostLikeAction,
  deletePostAction,
  createCommentAction,
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
import { MessageCircle, MoreVertical } from "lucide-react";

export default function CommunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, tokens } = useAuthStore();

  const [post, setPost] = useState<PostDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [showMenu, setShowMenu] = useState(false);

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
      // 좋아요 상태 업데이트
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
      setCommentContent("");
      setReplyTo(null);
      // 댓글 목록 새로고침
      const updatedPost = await getPostDetailAction(
        postId,
        tokens.access_token
      );
      if (updatedPost.success && updatedPost.data) {
        setPost(updatedPost.data);
      }
    }
  };

  const handleCommentLike = async (commentId: number) => {
    if (!tokens?.access_token) return;

    await toggleCommentLikeAction(commentId, tokens.access_token);
    // 댓글 목록 새로고침
    const updatedPost = await getPostDetailAction(postId, tokens.access_token);
    if (updatedPost.success && updatedPost.data) {
      setPost(updatedPost.data);
    }
  };

  const handleCommentDelete = async (commentId: number) => {
    if (!tokens?.access_token) return;
    if (!confirm("댓글을 삭제하시겠습니까?")) return;

    const result = await deleteCommentAction(commentId, tokens.access_token);
    if (result.success) {
      // 댓글 목록 새로고침
      const updatedPost = await getPostDetailAction(
        postId,
        tokens.access_token
      );
      if (updatedPost.success && updatedPost.data) {
        setPost(updatedPost.data);
      }
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
      // 게시글 새로고침
      const updatedPost = await getPostDetailAction(
        postId,
        tokens.access_token
      );
      if (updatedPost.success && updatedPost.data) {
        setPost(updatedPost.data);
      }
    }
  };

  // 판매자에게 문의하기 (채팅방 생성)
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

    // 자기 자신의 게시글에는 문의 불가
    if (user.id === postData.user_id) {
      toast.error("자신의 게시글에는 문의할 수 없습니다.");
      return;
    }

    const loadingToast = toast.loading("대화방을 생성하는 중...");

    try {
      // 게시글 타입에 따라 채팅방 타입 결정
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl max-w-md">
          <span>게시글을 찾을 수 없습니다.</span>
        </div>
      </div>
    );
  }

  const postData = post.data;
  const isAuthor = user?.id === postData.user_id;
  const isAdmin = user?.role === "admin";
  const canEdit = isAuthor || isAdmin;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[800px] mx-auto px-page py-8 w-full min-h-screen">
        {/* Post Content */}
        <div className="mb-6">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-3">{postData.title}</h1>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>
                    {postData.user.role === "admin"
                      ? postData.store?.name || postData.user.nickname
                      : postData.user.nickname}
                  </span>
                  <span>{new Date(postData.created_at).toLocaleString()}</span>
                  <span>조회 {postData.view_count}</span>
                </div>
              </div>

              {/* Action Buttons */}
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
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowMenu(false)}
                      />
                      {/* Menu */}
                      <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                        <Link
                          href={`/community/edit/${postData.id}`}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setShowMenu(false)}
                        >
                          수정
                        </Link>
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            handleDelete();
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                        >
                          삭제
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Gold Trade Info */}
            {postData.category === "gold_trade" && (
              <div className="bg-white p-4 mb-4">
                {/* 예약 상태 뱃지 (금 판매글만 - 금 구매글은 다수 대상 홍보글이므로 예약 불필요) */}
                {postData.type === 'sell_gold' && postData.reservation_status && (
                  <div className="mb-3">
                    {postData.reservation_status === 'reserved' ? (
                      <span className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full">
                        🔒 예약중 - {postData.reserved_by_user?.name || '구매자'}님과 거래 예정
                      </span>
                    ) : postData.reservation_status === 'completed' ? (
                      <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-600 text-sm font-semibold rounded-full">
                        ✅ 거래완료
                      </span>
                    ) : null}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-semibold">금 종류:</span>{" "}
                    {postData.gold_type || (
                      <span className="text-gray-500">문의</span>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold">중량:</span>{" "}
                    {postData.weight ? (
                      `${postData.weight}g`
                    ) : (
                      <span className="text-gray-500">문의</span>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold">가격:</span>{" "}
                    {postData.price ? (
                      `${postData.price.toLocaleString()}원`
                    ) : (
                      <span className="text-gray-500">문의</span>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold">지역:</span>{" "}
                    {postData.location || <span className="text-gray-500">-</span>}
                  </div>
                  {postData.store && (
                    <div className="col-span-2">
                      <span className="font-semibold">매장:</span>{" "}
                      <Link
                        href={`/stores/${postData.store.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {postData.store.name}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Content */}
            <div className="prose max-w-none my-8 mb-40">
              <p className="whitespace-pre-wrap text-gray-700">
                {postData.content}
              </p>
            </div>

            {/* Images */}
            {postData.image_urls && postData.image_urls.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {postData.image_urls.map((url, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={url}
                      alt={`이미지 ${index + 1}`}
                      className="w-full h-48 object-contain"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Like Button */}
            <div className="flex justify-center items-center gap-4">
              <button
                onClick={handleLike}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                  post.is_liked
                    ? "bg-red-50 text-red-600 border border-red-200"
                    : "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
                }`}
                disabled={!user}
              >
                ❤️ 좋아요 {postData.like_count}
              </button>
            </div>
          </div>
        </div>

        {/* Comments Section or Contact Section */}
        {postData.category === "gold_trade" ? (
          /* 금거래 - 채팅 문의 섹션 */
          <div className="mt-8">
            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-8 border-2 border-yellow-200">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mb-4">
                  <MessageCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  금 거래 문의하기
                </h3>
                <p className="text-gray-600 mb-6 max-w-md">
                  가격, 수량, 거래 조건 등 민감한 정보는<br />
                  1:1 채팅으로 안전하게 상담하세요
                </p>
                {user ? (
                  !isAuthor ? (
                    // 권한별 문의 가능 여부 체크
                    (postData.type === 'sell_gold' && user.role === 'admin') ||
                    (postData.type === 'buy_gold' && user.role === 'user') ? (
                      <button
                        onClick={handleContactSeller}
                        className="px-8 py-4 bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-base font-bold rounded-xl transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg flex items-center gap-2"
                      >
                        <MessageCircle className="w-5 h-5" />
                        {postData.type === 'sell_gold' ? '판매자에게 문의하기' : '매장에 문의하기'}
                      </button>
                    ) : (
                      <div className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm">
                        {postData.type === 'sell_gold'
                          ? '금 판매 문의는 매장(관리자)만 가능합니다'
                          : '금 구매 문의는 일반 사용자만 가능합니다'}
                      </div>
                    )
                  ) : (
                    <div className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm">
                      본인이 작성한 게시글입니다
                    </div>
                  )
                ) : (
                  <Link
                    href="/login"
                    className="px-8 py-4 bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-base font-bold rounded-xl transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg flex items-center gap-2"
                  >
                    로그인하고 문의하기
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* 금소식, QnA - 댓글 섹션 */
          <div className="mt-8">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <img src="/favicon.ico" alt="favicon" className="w-5 h-5" />
              댓글 {postData.comment_count}
              {postData.category === "qna" &&
                !postData.is_answered &&
                " (답변 채택 대기 중)"}
            </h2>

            {/* Comment Form */}
            {user ? (
              <form onSubmit={handleCommentSubmit} className="mb-6">
                {replyTo && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-500">답글 작성 중...</span>
                    <button
                      type="button"
                      onClick={() => setReplyTo(null)}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      취소
                    </button>
                  </div>
                )}
                <textarea
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 mb-2"
                  placeholder={
                    postData.category === "qna"
                      ? "답변을 작성하세요"
                      : "댓글을 입력하세요"
                  }
                  rows={3}
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-all disabled:opacity-50"
                    disabled={!commentContent.trim()}
                  >
                    {postData.category === "qna" ? "답변 작성" : "댓글 작성"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-6 py-4 rounded-lg mb-6">
                <span>
                  댓글을 작성하려면{" "}
                  <Link href="/login" className="underline font-semibold">
                    로그인
                  </Link>
                  이 필요합니다.
                </span>
              </div>
            )}

            {/* Comment List */}
            <div className="space-y-4">
              {postData.comments?.map((comment) => (
                <div
                  key={comment.id}
                  className="border-l-4 border-gray-200 pl-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{comment.user.nickname}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                      {comment.is_accepted && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">
                          채택됨
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Accept Answer Button (QnA only) */}
                      {postData.category === "qna" &&
                        !postData.is_answered &&
                        isAuthor &&
                        comment.is_answer &&
                        !comment.parent_id && (
                          <button
                            onClick={() => handleAcceptAnswer(comment.id)}
                            className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700"
                          >
                            채택
                          </button>
                        )}

                      {/* Like Button */}
                      <button
                        onClick={() => handleCommentLike(comment.id)}
                        className="text-sm text-gray-600 hover:text-gray-900"
                        disabled={!user}
                      >
                        ❤️ {comment.like_count}
                      </button>

                      {/* Reply Button */}
                      {user && !comment.parent_id && (
                        <button
                          onClick={() => setReplyTo(comment.id)}
                          className="text-sm text-gray-600 hover:text-gray-900"
                        >
                          답글
                        </button>
                      )}

                      {/* Delete Button */}
                      {(user?.id === comment.user_id || isAdmin) && (
                        <button
                          onClick={() => handleCommentDelete(comment.id)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="whitespace-pre-wrap mb-2 text-gray-700">
                    {comment.content}
                  </p>

                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-4 space-y-3 ml-6">
                      {comment.replies.map((reply: CommunityComment) => (
                        <div
                          key={reply.id}
                          className="border-l-2 border-gray-200 pl-4"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">
                                {reply.user.nickname}
                              </span>
                              <span className="text-sm text-gray-500">
                                {new Date(reply.created_at).toLocaleString()}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleCommentLike(reply.id)}
                                className="text-sm text-gray-600 hover:text-gray-900"
                                disabled={!user}
                              >
                                ❤️ {reply.like_count}
                              </button>

                              {(user?.id === reply.user_id || isAdmin) && (
                                <button
                                  onClick={() => handleCommentDelete(reply.id)}
                                  className="text-sm text-red-600 hover:text-red-700"
                                >
                                  삭제
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="whitespace-pre-wrap text-sm text-gray-700">
                            {reply.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
