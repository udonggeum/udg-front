"use server";

import axios, { AxiosError } from "axios";
import type {
  ChatRoomsResponse,
  CreateChatRoomRequest,
  CreateChatRoomResponse,
  MessagesResponse,
  SendMessageRequest,
  ChatRoom,
} from "@/types/chat";

const apiClient = axios.create({
  baseURL: "http://43.200.249.22:8080/api/v1",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * 채팅방 생성 또는 기존 채팅방 가져오기
 */
export async function createChatRoomAction(
  data: CreateChatRoomRequest,
  token: string
): Promise<{
  success: boolean;
  data?: CreateChatRoomResponse;
  error?: string;
}> {
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
    console.error("Create chat room error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.error || "채팅방 생성에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다.",
    };
  }
}

/**
 * 채팅방 목록 조회
 */
export async function getChatRoomsAction(
  token: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{
  success: boolean;
  data?: ChatRoomsResponse;
  error?: string;
}> {
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
    console.error("Get chat rooms error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: string }>;
      return {
        success: false,
        error:
          axiosError.response?.data?.error || "채팅방 목록 조회에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다.",
    };
  }
}

/**
 * 채팅방 상세 조회
 */
export async function getChatRoomAction(
  roomId: number,
  token: string
): Promise<{
  success: boolean;
  data?: { room: ChatRoom };
  error?: string;
}> {
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
    console.error("Get chat room error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.error || "채팅방 조회에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다.",
    };
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
): Promise<{
  success: boolean;
  data?: MessagesResponse;
  error?: string;
}> {
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
    console.error("Get messages error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: string }>;
      return {
        success: false,
        error:
          axiosError.response?.data?.error || "메시지 목록 조회에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다.",
    };
  }
}

/**
 * 메시지 전송
 */
export async function sendMessageAction(
  roomId: number,
  data: SendMessageRequest,
  token: string
): Promise<{
  success: boolean;
  data?: { message: any };
  error?: string;
}> {
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
    console.error("Send message error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.error || "메시지 전송에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다.",
    };
  }
}

/**
 * 채팅방을 읽음 처리
 */
export async function markAsReadAction(
  roomId: number,
  token: string
): Promise<{
  success: boolean;
  error?: string;
}> {
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
    console.error("Mark as read error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.error || "읽음 처리에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다.",
    };
  }
}

/**
 * 채팅방 참여
 */
export async function joinChatRoomAction(
  roomId: number,
  token: string
): Promise<{
  success: boolean;
  error?: string;
}> {
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
    console.error("Join chat room error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: string }>;
      return {
        success: false,
        error:
          axiosError.response?.data?.error || "채팅방 참여에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다.",
    };
  }
}

/**
 * 채팅방 나가기
 */
export async function leaveChatRoomAction(
  roomId: number,
  token: string
): Promise<{
  success: boolean;
  error?: string;
}> {
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
    console.error("Leave chat room error:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.error || "채팅방 나가기에 실패했습니다.",
      };
    }

    return {
      success: false,
      error: "서버에 연결할 수 없습니다.",
    };
  }
}
