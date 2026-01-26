import type { Notification } from "@/types/notification";

/**
 * 문자열을 slug 형식으로 변환 (한글 포함)
 */
function generateSlug(text: string | null | undefined): string {
  if (!text) return "detail";

  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s가-힣-]/g, "") // 특수문자 제거 (한글, 영문, 숫자, 하이픈 유지)
    .replace(/\s+/g, "-") // 공백을 하이픈으로
    .replace(/-+/g, "-") // 연속된 하이픈을 하나로
    .substring(0, 100) || "detail"; // 최대 100자
}

/**
 * 알림 링크를 올바른 형식으로 변환
 * 서버에서 보내는 링크 형식이 실제 라우트와 다를 수 있으므로 클라이언트에서 변환
 */
export function getNotificationLink(notification: Notification): string {
  const {
    link,
    type,
    related_post_id,
    related_post_title,
    related_chat_room_id,
    related_store_id,
    related_store_name
  } = notification;

  // 채팅 관련 알림
  if (type === "new_chat_message") {
    // related_chat_room_id가 있으면 우선 사용
    if (related_chat_room_id) {
      return `/chats/${related_chat_room_id}`;
    }

    // 링크에서 roomId 추출
    // /chat/{roomId}를 /chats/{roomId}로 변환
    if (link.includes("/chat/")) {
      return link.replace("/chat/", "/chats/");
    }

    // /chats/{roomId} 형식이면 그대로 사용
    const chatsMatch = link.match(/\/chats\/(\d+)/);
    if (chatsMatch) {
      return link;
    }

    // chat 또는 chats 패턴에서 roomId 추출
    const chatIdMatch = link.match(/\/chats?\/(\d+)/);
    if (chatIdMatch) {
      const roomId = chatIdMatch[1];
      return `/chats/${roomId}`;
    }
  }

  // 게시글 관련 알림 (post_comment, new_sell_post)
  if ((type === "post_comment" || type === "new_sell_post") && related_post_id) {
    // 링크에 이미 slug가 있는 경우 (예: /community/posts/123/some-slug)
    const fullMatch = link.match(/\/community\/posts\/(\d+)\/([^/?#]+)/);
    if (fullMatch) {
      return link; // 이미 올바른 형식
    }

    // slug 생성 (제목이 있으면 제목 기반, 없으면 기본값)
    const slug = generateSlug(related_post_title);

    // 링크가 /posts/{id} 형식이면 /community/posts/{id}/{slug}로 변환
    const postIdMatch = link.match(/\/posts\/(\d+)/);
    if (postIdMatch) {
      const postId = postIdMatch[1];
      return `/community/posts/${postId}/${slug}`;
    }

    // 링크에 community는 있지만 slug가 없는 경우
    const communityMatch = link.match(/\/community\/posts\/(\d+)$/);
    if (communityMatch) {
      const postId = communityMatch[1];
      return `/community/posts/${postId}/${slug}`;
    }

    // related_post_id를 사용하여 링크 생성
    return `/community/posts/${related_post_id}/${slug}`;
  }

  // 매장 관련 알림
  if (type === "store_liked" && related_store_id) {
    // 링크에 이미 slug가 있는 경우 (예: /stores/123/some-store)
    const fullMatch = link.match(/\/stores\/(\d+)\/([^/?#]+)/);
    if (fullMatch) {
      return link; // 이미 올바른 형식
    }

    // slug 생성 (매장명이 있으면 매장명 기반, 없으면 기본값)
    const slug = generateSlug(related_store_name);

    // 링크가 /stores/{id} 형식이면 /stores/{id}/{slug}로 변환
    const storeMatch = link.match(/\/stores\/(\d+)$/);
    if (storeMatch) {
      const storeId = storeMatch[1];
      return `/stores/${storeId}/${slug}`;
    }

    // 링크가 없거나 잘못된 경우 related_store_id 사용
    return `/stores/${related_store_id}/${slug}`;
  }

  // 기본값: 원본 링크 반환
  return link;
}
