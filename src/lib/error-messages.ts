/**
 * 백엔드 에러 메시지 한글 번역 매핑
 * 새로운 에러 메시지는 여기에 추가하세요
 */
export const ERROR_MESSAGES: Record<string, string> = {
  // ==================== 인증 관련 ====================
  "Invalid email or password": "이메일 또는 비밀번호를 확인해주세요.",
  "Invalid credentials": "이메일 또는 비밀번호를 확인해주세요.",
  "Email already exists": "이미 사용 중인 이메일입니다.",
  "Nickname already exists": "이미 사용 중인 닉네임입니다.",
  "User not found": "사용자를 찾을 수 없습니다.",
  "Unauthorized": "로그인이 필요합니다.",

  // ==================== 토큰 관련 ====================
  "Invalid or expired refresh token": "로그인이 만료되었습니다. 다시 로그인해주세요.",
  "Invalid token": "잘못된 인증 정보입니다.",
  "invalid token": "잘못된 인증 정보입니다.",
  "Token expired": "로그인이 만료되었습니다. 다시 로그인해주세요.",
  "token has expired": "로그인이 만료되었습니다. 다시 로그인해주세요.",
  "Invalid authentication token": "잘못된 인증 토큰입니다. 다시 로그인해주세요.",
  "Authorization header is required": "로그인이 필요합니다.",
  "Invalid authorization header format": "잘못된 인증 형식입니다. 다시 로그인해주세요.",
  "Please refresh your access token": "로그인이 만료되었습니다. 다시 로그인해주세요.",

  // ==================== 검증 관련 ====================
  "Invalid request data": "입력 정보를 확인해주세요.",
  "Invalid verification code": "인증번호가 올바르지 않습니다.",
  "Invalid or expired verification code": "인증번호가 만료되었거나 올바르지 않습니다.",
  "Verification code expired": "인증번호가 만료되었습니다. 다시 요청해주세요.",

  // ==================== 권한 관련 ====================
  "Insufficient permissions": "권한이 없습니다.",
  "Authentication required": "로그인이 필요합니다.",
  "Access denied": "접근 권한이 없습니다.",
  "User not authenticated": "로그인이 필요합니다.",
  "Role information not found": "권한 정보를 확인할 수 없습니다.",

  // ==================== 매장 관련 ====================
  "Store not found": "매장을 찾을 수 없습니다.",
  "Phone verification required": "휴대폰 인증이 필요합니다.",
  "Failed to verify business number": "사업자 인증에 실패했습니다.",
  "Business verification failed": "사업자 정보를 확인해주세요.",

  // ==================== 게시글/댓글 관련 ====================
  "Post not found": "게시글을 찾을 수 없습니다.",
  "Comment not found": "댓글을 찾을 수 없습니다.",
  "Cannot delete post": "게시글을 삭제할 수 없습니다.",
  "Cannot edit post": "게시글을 수정할 수 없습니다.",

  // ==================== 채팅 관련 ====================
  "Chat room not found": "채팅방을 찾을 수 없습니다.",
  "Message not found": "메시지를 찾을 수 없습니다.",
  "Cannot send message": "메시지를 전송할 수 없습니다.",

  // ==================== 파일 업로드 관련 ====================
  "File too large": "파일 크기가 너무 큽니다.",
  "Invalid file type": "지원하지 않는 파일 형식입니다.",
  "Upload failed": "파일 업로드에 실패했습니다.",

  // ==================== 일반 에러 ====================
  "Internal server error": "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  "Bad request": "잘못된 요청입니다.",
  "Not found": "요청하신 정보를 찾을 수 없습니다.",
  "Failed to fetch": "데이터를 불러오는데 실패했습니다.",
};

/**
 * 백엔드 에러 메시지를 한국어로 변환
 */
export function translateErrorMessage(message: string): string {
  // 정확히 일치하는 메시지가 있으면 반환
  if (ERROR_MESSAGES[message]) {
    return ERROR_MESSAGES[message];
  }

  // 부분 일치 확인 (대소문자 구분 없이)
  const lowerMessage = message.toLowerCase();
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (lowerMessage.includes(key.toLowerCase())) {
      return value;
    }
  }

  // 매핑되지 않은 메시지는 원본 반환
  console.warn(`번역되지 않은 에러 메시지: "${message}"`);
  return message;
}
