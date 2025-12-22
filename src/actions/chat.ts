"use server";

import { apiClient, handleApiError, type ApiResponse } from "@/lib/axios";
import type {
  ChatRoomsResponse,
  CreateChatRoomRequest,
  CreateChatRoomResponse,
  MessagesResponse,
  SendMessageRequest,
  ChatRoom,
} from "@/types/chat";

/**
 * 채팅방 생성 또는 기존 채팅방 가져오기
 */
export async function createChatRoomAction(
  data: CreateChatRoomRequest,
  token: string
): Promise<ApiResponse<CreateChatRoomResponse>> {
  try {
    const response = await apiClient.post<CreateChatRoomResponse>(
      "/chats/rooms",
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "채팅방 생성에 실패했습니다.");
  }
}

/**
 * 채팅방 목록 조회
 */
export async function getChatRoomsAction(
  token: string,
  page: number = 1,
  pageSize: number = 20
): Promise<ApiResponse<ChatRoomsResponse>> {
  try {
    const response = await apiClient.get<ChatRoomsResponse>("/chats/rooms", {
      params: { page, page_size: pageSize },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "채팅방 목록 조회에 실패했습니다.");
  }
}

/**
 * 채팅방 상세 조회
 */
export async function getChatRoomAction(
  roomId: number,
  token: string
): Promise<ApiResponse<{ room: ChatRoom }>> {
  try {
    const response = await apiClient.get<{ room: ChatRoom }>(
      `/chats/rooms/${roomId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "채팅방 조회에 실패했습니다.");
  }
}

/**
 * 메시지 목록 조회
 */
export async function getMessagesAction(
  roomId: number,
  token: string,
  page: number = 1,
  pageSize: number = 50
): Promise<ApiResponse<MessagesResponse>> {
  try {
    const response = await apiClient.get<MessagesResponse>(
      `/chats/rooms/${roomId}/messages`,
      {
        params: { page, page_size: pageSize },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "메시지 목록 조회에 실패했습니다.");
  }
}

/**
 * 메시지 전송
 */
export async function sendMessageAction(
  roomId: number,
  data: SendMessageRequest,
  token: string
): Promise<ApiResponse<{ message: any }>> {
  try {
    const response = await apiClient.post(
      `/chats/rooms/${roomId}/messages`,
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "메시지 전송에 실패했습니다.");
  }
}

/**
 * 채팅방을 읽음 처리
 */
export async function markAsReadAction(
  roomId: number,
  token: string
): Promise<ApiResponse> {
  try {
    await apiClient.post(
      `/chats/rooms/${roomId}/read`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return {
      success: true,
    };
  } catch (error) {
    return handleApiError(error, "읽음 처리에 실패했습니다.");
  }
}

/**
 * 채팅방 참여
 */
export async function joinChatRoomAction(
  roomId: number,
  token: string
): Promise<ApiResponse> {
  try {
    await apiClient.post(
      `/chats/rooms/${roomId}/join`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return {
      success: true,
    };
  } catch (error) {
    return handleApiError(error, "채팅방 참여에 실패했습니다.");
  }
}

/**
 * 채팅방 나가기
 */
export async function leaveChatRoomAction(
  roomId: number,
  token: string
): Promise<ApiResponse> {
  try {
    await apiClient.post(
      `/chats/rooms/${roomId}/leave`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return {
      success: true,
    };
  } catch (error) {
    return handleApiError(error, "채팅방 나가기에 실패했습니다.");
  }
}

/**
 * 채팅방 삭제
 */
export async function deleteChatRoomAction(
  roomId: number,
  token: string
): Promise<ApiResponse> {
  try {
    await apiClient.delete(`/chats/rooms/${roomId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    return handleApiError(error, "채팅방 삭제에 실패했습니다.");
  }
}
