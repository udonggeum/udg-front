import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Notification } from "@/types/notification";

interface NotificationStore {
  // 안읽은 알림 개수
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
  decrementUnreadCount: () => void;

  // 최근 알림 (드롭다운용, 최대 5개)
  recentNotifications: Notification[];
  setRecentNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: number) => void;
  removeNotification: (notificationId: number) => void;

  // 초기화
  reset: () => void;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set) => ({
      unreadCount: 0,
      recentNotifications: [],

      setUnreadCount: (count) => set({ unreadCount: count }),

      incrementUnreadCount: () =>
        set((state) => ({ unreadCount: state.unreadCount + 1 })),

      decrementUnreadCount: () =>
        set((state) => ({
          unreadCount: Math.max(0, state.unreadCount - 1),
        })),

      setRecentNotifications: (notifications) =>
        set({ recentNotifications: notifications.slice(0, 5) }),

      addNotification: (notification) =>
        set((state) => ({
          recentNotifications: [notification, ...state.recentNotifications].slice(0, 5),
          unreadCount: state.unreadCount + 1,
        })),

      markAsRead: (notificationId) =>
        set((state) => ({
          recentNotifications: state.recentNotifications.map((n) =>
            n.id === notificationId ? { ...n, is_read: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        })),

      removeNotification: (notificationId) =>
        set((state) => ({
          recentNotifications: state.recentNotifications.filter(
            (n) => n.id !== notificationId
          ),
        })),

      reset: () =>
        set({
          unreadCount: 0,
          recentNotifications: [],
        }),
    }),
    {
      name: "notification-storage",
    }
  )
);
