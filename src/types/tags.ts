/**
 * Tag type
 * 태그
 */
export interface Tag {
  id: number;
  name: string;
  category: string;
  created_at: string;
  updated_at: string;
}

/**
 * Tags response type
 * 태그 목록 응답
 */
export interface TagsResponse {
  tags: Tag[];
}

/**
 * Tags by category
 * 카테고리별 태그 그룹
 */
export interface TagsByCategory {
  [category: string]: Tag[];
}
