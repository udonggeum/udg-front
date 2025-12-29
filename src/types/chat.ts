/**
 * 채팅 타입
 * 백엔드와 일치: SALE (판매글/금거래), STORE (매장 문의)
 */

export type ChatRoomType = "SALE" | "STORE";

export type MessageType = "TEXT" | "IMAGE" | "FILE";

export type MessageStatus = "pending" | "sent" | "failed";

/**
 * User 정보 (채팅용 간소화 버전)
 */
export interface ChatUser {
  id: number;
  email: string;
  name: string;
  profile_image_url?: string;
  role?: "user" | "admin";
  store?: {
    id: number;
    name: string;
  };
}

/**
 * 채팅방
 */
export interface ChatRoom {
  id: number;
  type: ChatRoomType;
  user1_id: number;
  user2_id: number;
  user1?: ChatUser;
  user2?: ChatUser;
  product_id?: number;
  product?: {
    id: number;
    title: string;
    gold_type?: string;
    weight?: number;
    price?: number;
  };
  store_id?: number;
  store?: {
    id: number;
    name: string;
  };
  last_message_id?: number;
  last_message_content?: string;
  last_message_at?: string;
  user1_unread_count: number;
  user2_unread_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * 읽지 않은 메시지 수 포함 채팅방
 */
export interface ChatRoomWithUnread extends ChatRoom {
  unread_count: number;
}

/**
 * 메시지
 */
export interface Message {
  id: number;
  chat_room_id: number;
  sender_id: number;
  sender?: ChatUser;
  content: string;
  message_type: MessageType;
  file_url?: string; // 파일/이미지 URL
  file_name?: string; // 원본 파일명
  is_read: boolean;
  read_at?: string;
  is_edited?: boolean; // 수정 여부
  edited_at?: string; // 수정 시간
  is_deleted?: boolean; // 삭제 여부
  deleted_by?: number; // 삭제한 사용자 ID
  created_at: string;
  updated_at: string;
  // 클라이언트 전용 필드 (전송 상태 관리)
  status?: MessageStatus;
  tempId?: string; // 임시 ID (전송 전)
  error?: string; // 실패 시 에러 메시지
}

/**
 * 채팅방 생성 요청
 */
export interface CreateChatRoomRequest {
  target_user_id: number;
  type: ChatRoomType;
  product_id?: number;
  store_id?: number;
}

/**
 * 메시지 전송 요청
 */
export interface SendMessageRequest {
  content: string;
  message_type?: MessageType;
  file_url?: string;
  file_name?: string;
}

/**
 * 채팅방 목록 응답
 */
export interface ChatRoomsResponse {
  rooms: ChatRoomWithUnread[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * 채팅방 생성 응답
 */
export interface CreateChatRoomResponse {
  room: ChatRoom;
  is_new: boolean;
}

/**
 * 메시지 목록 응답
 */
export interface MessagesResponse {
  messages: Message[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * WebSocket 메시지
 */
export interface WebSocketMessage {
  type: "new_message" | "read" | "typing_start" | "typing_stop" | "online" | "offline" | "message_updated" | "message_deleted";
  message?: Message;
  message_id?: number; // 삭제된 메시지 ID
  room_id?: number;
  chat_room_id?: number;
  user_id?: number;
}
