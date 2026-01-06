// ==================== Enums ====================

export type PostCategory = 'gold_trade' | 'gold_news' | 'qna';

export type PostType =
  | 'sell_gold'
  | 'buy_gold'
  | 'product_news'
  | 'store_news'
  | 'other'
  | 'question'
  | 'faq';

export type PostStatus = 'active' | 'inactive' | 'deleted' | 'reported';

// ==================== Models ====================

export interface PostAuthor {
  id: number;
  email: string;
  name: string;
  nickname: string;
  role: 'user' | 'admin';
  profile_image?: string;
  store?: PostStore;
}

export interface PostStore {
  id: number;
  name: string;
  slug?: string;
  region?: string;
  district?: string;
  address?: string;
  phone_number?: string;
  image_url?: string;
}

export interface CommunityPost {
  id: number;
  created_at: string;
  updated_at: string;

  // 기본 정보
  title: string;
  slug: string; // URL용 고유 식별자 (SEO)
  content: string;
  category: PostCategory;
  type: PostType;
  status: PostStatus;

  // 작성자
  user_id: number;
  user: PostAuthor;

  // 금거래 관련 (optional)
  gold_type?: string | null;
  weight?: number | null;
  price?: number | null;
  location?: string | null;
  store_id?: number | null;
  store?: PostStore | null;

  // 예약 및 거래 완료 관련 (금거래만)
  reservation_status?: string | null; // null=판매중, reserved=예약중, completed=거래완료
  reserved_by_user_id?: number | null;
  reserved_by_user?: PostAuthor | null;
  reserved_at?: string | null;
  completed_at?: string | null;

  // QnA 관련
  is_answered: boolean;
  accepted_answer_id?: number | null;

  // 매장 게시글 관리
  is_pinned: boolean;

  // 통계
  view_count: number;
  like_count: number;
  comment_count: number;

  // 이미지
  image_urls: string[];
}

export interface CommunityComment {
  id: number;
  created_at: string;
  updated_at: string;

  content: string;
  user_id: number;
  user: PostAuthor;
  post_id: number;
  parent_id?: number | null;

  // QnA
  is_answer: boolean;
  is_accepted: boolean;

  // 통계
  like_count: number;

  // 대댓글
  replies?: CommunityComment[];
}

// ==================== Request Types ====================

export interface CreatePostRequest {
  title: string;
  content: string;
  category: PostCategory;
  type: PostType;
  gold_type?: string;
  weight?: number;
  price?: number;
  location?: string;
  region?: string;
  district?: string;
  image_urls?: string[];
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  status?: PostStatus;
  gold_type?: string;
  weight?: number;
  price?: number;
  location?: string;
  image_urls?: string[];
}

export interface CreateCommentRequest {
  content: string;
  post_id: number;
  parent_id?: number;
  is_answer?: boolean;
}

export interface UpdateCommentRequest {
  content?: string;
}

// ==================== Query Types ====================

export interface PostListQuery {
  category?: PostCategory;
  type?: PostType;
  status?: PostStatus;
  user_id?: number;
  store_id?: number;
  is_answered?: boolean;
  search?: string;
  page?: number;
  page_size?: number;

  // 지역 필터 (다중 선택 지원)
  regions?: string[];   // 시/도 목록
  districts?: string[]; // 시/군/구 목록

  // 하위 호환성을 위한 단일 지역 필터 (deprecated)
  region?: string;
  district?: string;

  sort_by?: 'created_at' | 'view_count' | 'like_count' | 'comment_count';
  sort_order?: 'asc' | 'desc';
}

export interface CommentListQuery {
  post_id: number;
  parent_id?: number;
  page?: number;
  page_size?: number;
  sort_by?: 'created_at' | 'like_count';
  sort_order?: 'asc' | 'desc';
}

// ==================== Response Types ====================

export interface PostListResponse {
  data: CommunityPost[];
  total: number;
  page: number;
  page_size: number;
}

export interface PostDetailResponse {
  data: CommunityPost & {
    comments?: CommunityComment[];
  };
  is_liked: boolean;
}

export interface CommentListResponse {
  data: CommunityComment[];
  total: number;
  page: number;
  page_size: number;
}

export interface LikeResponse {
  is_liked: boolean;
}

export interface AcceptAnswerResponse {
  message: string;
}

export interface GalleryItem {
  post_id: number;
  image_url: string;
  title: string;
  content: string;
  created_at: string;
}

export interface GalleryResponse {
  data: GalleryItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface GenerateContentRequest {
  type: PostType;
  keywords: string[];
  title?: string;
  gold_type?: string;
  weight?: number;
  price?: number;
  location?: string;
}

export interface GenerateContentResponse {
  content: string;
  generated_at?: string;
}

// ==================== 유틸리티 상수 ====================

export const POST_CATEGORY_LABELS: Record<PostCategory, string> = {
  gold_trade: '금거래',
  gold_news: '금소식',
  qna: 'QnA',
};

export const POST_TYPE_LABELS: Record<PostType, string> = {
  sell_gold: '금 판매',
  buy_gold: '금 구매',
  product_news: '상품 소식',
  store_news: '매장 소식',
  other: '기타',
  question: '질문',
  faq: 'FAQ',
};

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  active: '활성',
  inactive: '비활성',
  deleted: '삭제됨',
  reported: '신고됨',
};

// 카테고리별 허용 타입
export const CATEGORY_TYPES: Record<PostCategory, PostType[]> = {
  gold_trade: ['sell_gold', 'buy_gold'],
  gold_news: ['product_news', 'store_news', 'other'],
  qna: ['question'],
};

// 관리자만 작성 가능한 타입
// - buy_gold: 금 구매(금은방 사장님의 매입 홍보)
// - product_news, store_news, other: 금소식 카테고리 전체
// - faq: 관리자 공식 FAQ
export const ADMIN_ONLY_TYPES: PostType[] = ['buy_gold', 'product_news', 'store_news', 'other', 'faq'];
