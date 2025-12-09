import { create } from 'zustand';
import { toast } from 'sonner';

/**
 * Toast type (Sonner와 호환)
 */
export interface Toast {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

/**
 * UI store state
 */
interface UIState {
  modals: Record<string, boolean>;
}

/**
 * UI store actions
 */
interface UIActions {
  // Modal 액션
  openModal: (id: string) => void;
  closeModal: (id: string) => void;
  toggleModal: (id: string) => void;
  closeAllModals: () => void;

  // Toast 액션 (Sonner를 직접 호출)
  showToast: (toastData: Toast) => void;
}

/**
 * UI store type
 */
type UIStore = UIState & UIActions;

/**
 * UI store
 *
 * 글로벌 UI 상태를 관리합니다 (localStorage 저장 안함)
 * - Modals: ID로 모달 상태 관리
 * - Toasts: Sonner를 사용한 알림 메시지 시스템
 *
 * @example
 * // 모달
 * const { openModal, closeModal } = useUIStore();
 * openModal('confirm-dialog');
 * closeModal('confirm-dialog');
 *
 * // 토스트
 * const { showToast } = useUIStore();
 * showToast({ message: '저장되었습니다', type: 'success', duration: 3000 });
 */
export const useUIStore = create<UIStore>((set) => ({
  // 초기 상태
  modals: {},

  // Modal 액션
  openModal: (id) =>
    set((state) => ({
      modals: { ...state.modals, [id]: true },
    })),

  closeModal: (id) =>
    set((state) => ({
      modals: { ...state.modals, [id]: false },
    })),

  toggleModal: (id) =>
    set((state) => ({
      modals: { ...state.modals, [id]: !state.modals[id] },
    })),

  closeAllModals: () => set({ modals: {} }),

  // Toast 액션 (Sonner를 직접 호출)
  showToast: ({ message, type, duration }) => {
    const options = duration ? { duration } : undefined;

    switch (type) {
      case 'success':
        toast.success(message, options);
        break;
      case 'error':
        toast.error(message, options);
        break;
      case 'warning':
        toast.warning(message, options);
        break;
      case 'info':
        toast.info(message, options);
        break;
      default:
        toast(message, options);
    }
  },
}));
