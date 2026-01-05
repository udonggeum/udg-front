"use server";

import type {
  PostListResponse,
  PostListQuery,
  PostDetailResponse,
  CreatePostRequest,
  UpdatePostRequest,
  CommunityPost,
  CommentListResponse,
  CommentListQuery,
  CreateCommentRequest,
  UpdateCommentRequest,
  CommunityComment,
  LikeResponse,
  AcceptAnswerResponse,
  GenerateContentRequest,
  GenerateContentResponse,
  GalleryResponse,
} from "@/types/community";
import { apiClient, handleApiError, type ApiResponse } from "@/lib/axios";

/**
 * 게시글 목록 조회
 */
export async function getPostsAction(
  params?: PostListQuery
): Promise<ApiResponse<PostListResponse>> {
  try {
    const response = await apiClient.get<PostListResponse>("/community/posts", {
      params,
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "게시글 목록 조회에 실패했습니다.", "GET /community/posts");
  }
}

/**
 * 게시글 상세 조회
 */
export async function getPostDetailAction(
  postId: number,
  accessToken?: string
): Promise<ApiResponse<PostDetailResponse>> {
  try {
    const headers = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : {};

    const response = await apiClient.get<PostDetailResponse>(
      `/community/posts/${postId}`,
      { headers }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "게시글 조회에 실패했습니다.");
  }
}

/**
 * 게시글 작성
 */
export async function createPostAction(
  data: CreatePostRequest,
  accessToken: string
): Promise<ApiResponse<CommunityPost>> {
  try {
    const response = await apiClient.post<CommunityPost | { post: CommunityPost; message: string }>(
      "/community/posts",
      data,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // 응답 구조 확인: { post: ... } 형태인지, 직접 post 객체인지
    const postData = 'post' in response.data ? response.data.post : response.data;

    return {
      success: true,
      data: postData,
    };
  } catch (error) {
    return handleApiError(error, "게시글 작성에 실패했습니다.", "POST /community/posts");
  }
}

/**
 * 게시글 수정
 */
export async function updatePostAction(
  postId: number,
  data: UpdatePostRequest,
  accessToken: string
): Promise<ApiResponse<CommunityPost>> {
  try {
    const response = await apiClient.put<CommunityPost | { post: CommunityPost; message: string }>(
      `/community/posts/${postId}`,
      data,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // 응답 구조 확인: { post: ... } 형태인지, 직접 post 객체인지
    const postData = 'post' in response.data ? response.data.post : response.data;

    return {
      success: true,
      data: postData,
    };
  } catch (error) {
    return handleApiError(error, "게시글 수정에 실패했습니다.");
  }
}

/**
 * 게시글 삭제
 */
export async function deletePostAction(
  postId: number,
  accessToken: string
): Promise<ApiResponse> {
  try {
    await apiClient.delete(`/community/posts/${postId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    return handleApiError(error, "게시글 삭제에 실패했습니다.");
  }
}

/**
 * 게시글 좋아요 토글
 */
export async function togglePostLikeAction(
  postId: number,
  accessToken: string
): Promise<ApiResponse<LikeResponse>> {
  try {
    const response = await apiClient.post<LikeResponse>(
      `/community/posts/${postId}/like`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "좋아요 처리에 실패했습니다.");
  }
}

/**
 * 댓글 목록 조회
 */
export async function getCommentsAction(
  params: CommentListQuery
): Promise<ApiResponse<CommentListResponse>> {
  try {
    const response = await apiClient.get<CommentListResponse>("/community/comments", {
      params,
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "댓글 목록 조회에 실패했습니다.");
  }
}

/**
 * 댓글 작성
 */
export async function createCommentAction(
  data: CreateCommentRequest,
  accessToken: string
): Promise<ApiResponse<CommunityComment>> {
  try {
    const response = await apiClient.post<{ comment: CommunityComment; message: string }>(
      "/community/comments",
      data,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return {
      success: true,
      data: response.data.comment,
    };
  } catch (error) {
    return handleApiError(error, "댓글 작성에 실패했습니다.");
  }
}

/**
 * 댓글 수정
 */
export async function updateCommentAction(
  commentId: number,
  data: UpdateCommentRequest,
  accessToken: string
): Promise<ApiResponse<CommunityComment>> {
  try {
    const response = await apiClient.put<{ comment: CommunityComment; message: string }>(
      `/community/comments/${commentId}`,
      data,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return {
      success: true,
      data: response.data.comment,
    };
  } catch (error) {
    return handleApiError(error, "댓글 수정에 실패했습니다.");
  }
}

/**
 * 댓글 삭제
 */
export async function deleteCommentAction(
  commentId: number,
  accessToken: string
): Promise<ApiResponse> {
  try {
    await apiClient.delete(`/community/comments/${commentId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    return handleApiError(error, "댓글 삭제에 실패했습니다.");
  }
}

/**
 * 댓글 좋아요 토글
 */
export async function toggleCommentLikeAction(
  commentId: number,
  accessToken: string
): Promise<ApiResponse<LikeResponse>> {
  try {
    const response = await apiClient.post<LikeResponse>(
      `/community/comments/${commentId}/like`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "좋아요 처리에 실패했습니다.");
  }
}

/**
 * QnA 답변 채택
 */
export async function acceptAnswerAction(
  postId: number,
  commentId: number,
  accessToken: string
): Promise<ApiResponse<AcceptAnswerResponse>> {
  try {
    const response = await apiClient.post<AcceptAnswerResponse>(
      `/community/posts/${postId}/accept/${commentId}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "답변 채택에 실패했습니다.");
  }
}

/**
 * AI 컨텐츠 생성
 */
export async function generateContentAction(
  data: GenerateContentRequest,
  accessToken: string
): Promise<ApiResponse<GenerateContentResponse>> {
  try {
    const response = await apiClient.post<GenerateContentResponse>(
      "/community/generate-content",
      data,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "컨텐츠 생성에 실패했습니다.");
  }
}

/**
 * 게시글 고정
 */
export async function pinPostAction(
  postId: number,
  accessToken: string
): Promise<ApiResponse> {
  try {
    await apiClient.post(
      `/community/posts/${postId}/pin`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return {
      success: true,
    };
  } catch (error) {
    return handleApiError(error, "게시글 고정에 실패했습니다.");
  }
}

/**
 * 게시글 고정 해제
 */
export async function unpinPostAction(
  postId: number,
  accessToken: string
): Promise<ApiResponse> {
  try {
    await apiClient.post(
      `/community/posts/${postId}/unpin`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return {
      success: true,
    };
  } catch (error) {
    return handleApiError(error, "게시글 고정 해제에 실패했습니다.");
  }
}

/**
 * 매장 갤러리 조회
 */
export async function getStoreGalleryAction(
  storeId: number,
  page: number = 1,
  pageSize: number = 20
): Promise<ApiResponse<GalleryResponse>> {
  try {
    const response = await apiClient.get<GalleryResponse>("/community/gallery", {
      params: {
        store_id: storeId,
        page,
        page_size: pageSize,
      },
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "갤러리 조회에 실패했습니다.");
  }
}

/**
 * 금거래 게시글 예약하기
 */
export async function reservePostAction(
  postId: number,
  reservedByUserId: number,
  accessToken: string
): Promise<ApiResponse<void>> {
  try {
    await apiClient.post(
      `/community/posts/${postId}/reserve`,
      {
        reserved_by_user_id: reservedByUserId,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return {
      success: true,
    };
  } catch (error) {
    return handleApiError(error, "게시글 예약에 실패했습니다.");
  }
}

/**
 * 금거래 예약 취소
 */
export async function cancelReservationAction(
  postId: number,
  accessToken: string
): Promise<ApiResponse<void>> {
  try {
    await apiClient.delete(`/community/posts/${postId}/reserve`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    return handleApiError(error, "예약 취소에 실패했습니다.");
  }
}

/**
 * 금거래 완료 처리
 */
export async function completeTransactionAction(
  postId: number,
  accessToken: string
): Promise<ApiResponse<void>> {
  try {
    await apiClient.post(
      `/community/posts/${postId}/complete`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return {
      success: true,
    };
  } catch (error) {
    return handleApiError(error, "거래 완료 처리에 실패했습니다.");
  }
}
