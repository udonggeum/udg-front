"use server";

import axios, { AxiosError } from "axios";
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
} from "@/types/community";

const apiClient = axios.create({
  baseURL: "http://43.200.249.22:8080/api/v1",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * 게시글 목록 조회
 */
export async function getPostsAction(
  params?: PostListQuery
): Promise<{ success: boolean; data?: PostListResponse; error?: string }> {
  try {
    const response = await apiClient.get<PostListResponse>("/community/posts", {
      params,
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error("Get posts error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "게시글 목록 조회에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}

/**
 * 게시글 상세 조회
 */
export async function getPostDetailAction(
  postId: number,
  accessToken?: string
): Promise<{ success: boolean; data?: PostDetailResponse; error?: string }> {
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
    console.error("Get post detail error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "게시글 조회에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}

/**
 * 게시글 작성
 */
export async function createPostAction(
  data: CreatePostRequest,
  accessToken: string
): Promise<{ success: boolean; data?: CommunityPost; error?: string }> {
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

    console.log("Create post response:", response.data);

    // 응답 구조 확인: { post: ... } 형태인지, 직접 post 객체인지
    const postData = 'post' in response.data ? response.data.post : response.data;

    return {
      success: true,
      data: postData,
    };
  } catch (error) {
    console.error("Create post error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "게시글 작성에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}

/**
 * 게시글 수정
 */
export async function updatePostAction(
  postId: number,
  data: UpdatePostRequest,
  accessToken: string
): Promise<{ success: boolean; data?: CommunityPost; error?: string }> {
  try {
    const response = await apiClient.put<{ post: CommunityPost; message: string }>(
      `/community/posts/${postId}`,
      data,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return {
      success: true,
      data: response.data.post,
    };
  } catch (error) {
    console.error("Update post error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "게시글 수정에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}

/**
 * 게시글 삭제
 */
export async function deletePostAction(
  postId: number,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
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
    console.error("Delete post error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "게시글 삭제에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}

/**
 * 게시글 좋아요 토글
 */
export async function togglePostLikeAction(
  postId: number,
  accessToken: string
): Promise<{ success: boolean; data?: LikeResponse; error?: string }> {
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
    console.error("Toggle post like error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "좋아요 처리에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}

/**
 * 댓글 목록 조회
 */
export async function getCommentsAction(
  params: CommentListQuery
): Promise<{ success: boolean; data?: CommentListResponse; error?: string }> {
  try {
    const response = await apiClient.get<CommentListResponse>("/community/comments", {
      params,
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error("Get comments error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "댓글 목록 조회에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}

/**
 * 댓글 작성
 */
export async function createCommentAction(
  data: CreateCommentRequest,
  accessToken: string
): Promise<{ success: boolean; data?: CommunityComment; error?: string }> {
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
    console.error("Create comment error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "댓글 작성에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}

/**
 * 댓글 수정
 */
export async function updateCommentAction(
  commentId: number,
  data: UpdateCommentRequest,
  accessToken: string
): Promise<{ success: boolean; data?: CommunityComment; error?: string }> {
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
    console.error("Update comment error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "댓글 수정에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}

/**
 * 댓글 삭제
 */
export async function deleteCommentAction(
  commentId: number,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
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
    console.error("Delete comment error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "댓글 삭제에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}

/**
 * 댓글 좋아요 토글
 */
export async function toggleCommentLikeAction(
  commentId: number,
  accessToken: string
): Promise<{ success: boolean; data?: LikeResponse; error?: string }> {
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
    console.error("Toggle comment like error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "좋아요 처리에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}

/**
 * QnA 답변 채택
 */
export async function acceptAnswerAction(
  postId: number,
  commentId: number,
  accessToken: string
): Promise<{ success: boolean; data?: AcceptAnswerResponse; error?: string }> {
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
    console.error("Accept answer error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "답변 채택에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}

/**
 * AI 컨텐츠 생성
 */
export async function generateContentAction(
  data: GenerateContentRequest,
  accessToken: string
): Promise<{ success: boolean; data?: GenerateContentResponse; error?: string }> {
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
    console.error("Generate content error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || "컨텐츠 생성에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.",
    };
  }
}
