/**
 * API Base URL
 * Use environment variable or fallback to production URL
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://43.200.249.22:8080';

/**
 * API Endpoints
 * 중앙화된 엔드포인트 정의
 * 모든 엔드포인트는 /api/v1로 시작
 */
export const ENDPOINTS = {
  AUTH: {
    REGISTER: '/api/v1/auth/register',
    LOGIN: '/api/v1/auth/login',
    LOGOUT: '/api/v1/auth/logout',
    REFRESH: '/api/v1/auth/refresh',
    ME: '/api/v1/auth/me',
    FORGOT_PASSWORD: '/api/v1/auth/forgot-password',
    RESET_PASSWORD: '/api/v1/auth/reset-password',
  },

  STORES: {
    LIST: '/api/v1/stores',
    LOCATIONS: '/api/v1/stores/locations',
    DETAIL: (id: number) => `/api/v1/stores/${id}`,
    CREATE: '/api/v1/stores',
    UPDATE: (id: number) => `/api/v1/stores/${id}`,
    DELETE: (id: number) => `/api/v1/stores/${id}`,
  },

  PRODUCTS: {
    LIST: '/api/v1/products',
    FILTERS: '/api/v1/products/filters',
    POPULAR: '/api/v1/products/popular',
    DETAIL: (id: number) => `/api/v1/products/${id}`,
    CREATE: '/api/v1/products',
    UPDATE: (id: number) => `/api/v1/products/${id}`,
    DELETE: (id: number) => `/api/v1/products/${id}`,
  },

  CART: {
    GET: '/api/v1/cart',
    ADD: '/api/v1/cart',
    UPDATE: (id: number) => `/api/v1/cart/${id}`,
    DELETE: (id: number) => `/api/v1/cart/${id}`,
    CLEAR: '/api/v1/cart',
  },

  ORDERS: {
    LIST: '/api/v1/orders',
    CREATE: '/api/v1/orders',
    DETAIL: (id: number) => `/api/v1/orders/${id}`,
    UPDATE_STATUS: (id: number) => `/api/v1/orders/${id}/status`,
    UPDATE_PAYMENT: (id: number) => `/api/v1/orders/${id}/payment`,
  },

  WISHLIST: {
    GET: '/api/v1/wishlist',
    ADD: '/api/v1/wishlist',
    DELETE: (productId: number) => `/api/v1/wishlist/${productId}`,
  },

  ADDRESSES: {
    LIST: '/api/v1/addresses',
    ADD: '/api/v1/addresses',
    UPDATE: (id: number) => `/api/v1/addresses/${id}`,
    DELETE: (id: number) => `/api/v1/addresses/${id}`,
    SET_DEFAULT: (id: number) => `/api/v1/addresses/${id}/default`,
  },

  PAYMENTS: {
    KAKAO: {
      READY: '/api/v1/payments/kakao/ready',
      SUCCESS: '/api/v1/payments/kakao/success',
      FAIL: '/api/v1/payments/kakao/fail',
      CANCEL: '/api/v1/payments/kakao/cancel',
      STATUS: (orderId: number) => `/api/v1/payments/kakao/status/${orderId}`,
      REFUND: (orderId: number) => `/api/v1/payments/kakao/${orderId}/refund`,
    },
  },

  SELLER: {
    DASHBOARD: '/api/v1/seller/dashboard',
    STORES: {
      LIST: '/api/v1/seller/stores',
      CREATE: '/api/v1/stores',
      UPDATE: (id: number) => `/api/v1/stores/${id}`,
      DELETE: (id: number) => `/api/v1/stores/${id}`,
      ORDERS: (storeId: number) => `/api/v1/seller/stores/${storeId}/orders`,
    },
    PRODUCTS: {
      LIST: (storeId: number) => `/api/v1/products?store_id=${storeId}`,
      CREATE: '/api/v1/products',
      UPDATE: (id: number) => `/api/v1/products/${id}`,
      DELETE: (id: number) => `/api/v1/products/${id}`,
    },
    ORDERS: {
      UPDATE_STATUS: (id: number) => `/api/v1/seller/orders/${id}/status`,
    },
  },

  IMAGES: {
    PRESIGNED_URL: '/api/v1/upload/presigned-url',
    OPTIMIZE: '/api/v1/images/optimize',
  },
} as const;

/**
 * Local storage keys
 * Zustand persist middleware에서 사용
 */
export const STORAGE_KEYS = {
  AUTH_STORE: 'auth-storage',
} as const;
