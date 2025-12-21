/**
 * 채팅 타입
 */

export type ChatRoomType = "SALE" | "STORE";

export type MessageType = "TEXT" | "IMAGE" | "FILE";

/**
 * User 정보 (채팅용 간소화 버전)
 */
export interface ChatUser {
  id: number;
  email: string;
  name: string;
  profile_image_url?: string;
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
  store_id?: number;
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
  is_read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
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
  type: "new_message" | "read" | "typing" | "online" | "offline";
  message?: Message;
  room_id?: number;
  user_id?: number;
}
