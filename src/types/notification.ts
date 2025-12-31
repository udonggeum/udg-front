// ==================== Enums ====================

export type NotificationType = 'new_sell_post' | 'post_comment' | 'store_liked';

export type NotificationRange = 'district' | 'region' | 'nationwide';

// ==================== Models ====================

export interface Notification {
  id: number;
  created_at: string;
  updated_at: string;

  // 알림 받을 사용자
  user_id: number;

  // 알림 타입
  type: NotificationType;

  // 알림 내용
  title: string;
  content: string;
  link: string;

  // 상태
  is_read: boolean;

  // 관련 데이터
  related_post_id?: number | null;
  related_store_id?: number | null;
  related_user_id?: number | null;
}

export interface NotificationSettings {
  // 금 판매글 알림
  sell_post_notification: boolean;
  sell_post_range: NotificationRange; // Deprecated
  selected_regions: string[]; // 선택한 지역 목록 (예: ["서울 강남구", "서울 서초구"])

  // 댓글 알림
  comment_notification: boolean;

  // 찜 알림
  like_notification: boolean;
}

// ==================== Request Types ====================

export interface UpdateNotificationSettingsRequest {
  sell_post_notification?: boolean;
  sell_post_range?: NotificationRange; // Deprecated
  selected_regions?: string[];
  comment_notification?: boolean;
  like_notification?: boolean;
}

// ==================== Response Types ====================

export interface NotificationListResponse {
  data: Notification[];
  total: number;
  page: number;
  page_size: number;
  unread_count: number;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface NotificationSettingsResponse {
  settings: NotificationSettings;
}

// ==================== Query Types ====================

export interface NotificationListQuery {
  page?: number;
  page_size?: number;
  is_read?: boolean;
  type?: NotificationType;
}

// ==================== 유틸리티 상수 ====================

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  new_sell_post: '새 금 판매글',
  post_comment: '댓글',
  store_liked: '매장 찜',
};

export const NOTIFICATION_RANGE_LABELS: Record<NotificationRange, string> = {
  district: '같은 구',
  region: '같은 시',
  nationwide: '전국',
};

export const NOTIFICATION_TYPE_ICONS: Record<NotificationType, string> = {
  new_sell_post: '📢',
  post_comment: '💭',
  store_liked: '❤️',
};
