"use server";

import type {
  NotificationListResponse,
  NotificationListQuery,
  Notification,
  UnreadCountResponse,
  NotificationSettingsResponse,
  UpdateNotificationSettingsRequest,
} from "@/types/notification";
import { apiClient, handleApiError, type ApiResponse } from "@/lib/axios";

/**
 * 알림 목록 조회
 */
export async function getNotificationsAction(
  params: NotificationListQuery,
  accessToken: string
): Promise<ApiResponse<NotificationListResponse>> {
  try {
    const response = await apiClient.get<NotificationListResponse>("/notifications", {
      params,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error, "알림 목록 조회에 실패했습니다.");
  }
}

/**
 * 안읽은 알림 개수 조회
 */
export async function getUnreadCountAction(
  accessToken: string
): Promise<ApiResponse<UnreadCountResponse>> {
  try {
    const response = await apiClient.get<UnreadCountResponse>(
      "/notifications/unread-count",
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
    return handleApiError(error, "안읽은 알림 개수 조회에 실패했습니다.");
  }
}

/**
 * 알림 읽음 처리
 */
export async function markNotificationAsReadAction(
  notificationId: number,
  accessToken: string
): Promise<ApiResponse<Notification>> {
  try {
    const response = await apiClient.patch<{ notification: Notification }>(
      `/notifications/${notificationId}/read`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return {
      success: true,
      data: response.data.notification,
    };
  } catch (error) {
    return handleApiError(error, "알림 읽음 처리에 실패했습니다.");
  }
}

/**
 * 모든 알림 읽음 처리
 */
export async function markAllNotificationsAsReadAction(
  accessToken: string
): Promise<ApiResponse> {
  try {
    await apiClient.patch(
      "/notifications/read-all",
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
    return handleApiError(error, "모든 알림 읽음 처리에 실패했습니다.");
  }
}

/**
 * 알림 삭제
 */
export async function deleteNotificationAction(
  notificationId: number,
  accessToken: string
): Promise<ApiResponse> {
  try {
    await apiClient.delete(`/notifications/${notificationId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    return handleApiError(error, "알림 삭제에 실패했습니다.");
  }
}

/**
 * 알림 설정 조회
 */
export async function getNotificationSettingsAction(
  accessToken: string
): Promise<ApiResponse<NotificationSettingsResponse>> {
  try {
    const response = await apiClient.get<NotificationSettingsResponse>(
      "/users/notification-settings",
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
    return handleApiError(error, "알림 설정 조회에 실패했습니다.");
  }
}

/**
 * 알림 설정 저장
 */
export async function updateNotificationSettingsAction(
  settings: UpdateNotificationSettingsRequest,
  accessToken: string
): Promise<ApiResponse<NotificationSettingsResponse>> {
  try {
    const response = await apiClient.put<NotificationSettingsResponse>(
      "/users/notification-settings",
      settings,
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
    return handleApiError(error, "알림 설정 저장에 실패했습니다.");
  }
}
