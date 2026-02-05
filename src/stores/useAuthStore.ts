import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Tokens } from '@/types/auth';

/**
 * Auth store state
 */
interface AuthState {
  user: User | null;
  tokens: Tokens | null;
  isAuthenticated: boolean;
  isLoggingOut: boolean;
}

/**
 * Auth store actions
 */
interface AuthActions {
  setAuth: (user: User, tokens: Tokens) => void;
  updateUser: (user: User) => void;
  updateTokens: (tokens: Tokens) => void;
  clearAuth: () => void;
  setIsLoggingOut: (isLoggingOut: boolean) => void;
}

/**
 * Auth store type
 */
type AuthStore = AuthState & AuthActions;

/**
 * Auth store
 *
 * 인증 상태를 localStorage에 자동 저장하고 관리합니다.
 * - 사용자 정보와 토큰을 localStorage에 저장
 * - 새로고침 시 자동으로 상태 복원
 * - 로그인, 로그아웃, 사용자 정보 업데이트 액션 제공
 *
 * @example
 * // 컴포넌트에서 사용
 * const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore();
 *
 * // 서비스나 인터셉터에서 사용 (React 외부)
 * const token = useAuthStore.getState().tokens?.access_token;
 * useAuthStore.getState().clearAuth();
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // 초기 상태
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoggingOut: false,

      // 액션: 로그인 시 사용자 정보와 토큰 저장
      setAuth: (user, tokens) =>
        set({
          user,
          tokens,
          isAuthenticated: true,
        }),

      // 액션: 사용자 정보만 업데이트
      updateUser: (user) =>
        set((state) => ({
          user,
          isAuthenticated: state.isAuthenticated,
        })),

      // 액션: 토큰만 업데이트 (토큰 갱신 시)
      updateTokens: (tokens) =>
        set((state) => ({
          tokens,
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        })),

      // 액션: 로그아웃 시 모든 상태 초기화
      clearAuth: () => {
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoggingOut: false,
        });

        // localStorage에서도 즉시 제거 (persist 미들웨어 외에도 명시적으로)
        try {
          localStorage.removeItem('auth-storage');
        } catch (error) {
          console.error('Failed to clear auth from localStorage:', error);
        }
      },

      // 액션: 로그아웃 플래그 설정
      setIsLoggingOut: (isLoggingOut) =>
        set({ isLoggingOut }),
    }),
    {
      name: 'auth-storage', // localStorage 키 이름
      storage: createJSONStorage(() => localStorage),
      // user, tokens, isAuthenticated 모두 저장
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
