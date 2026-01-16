/**
 * 백엔드 에러 코드 → 한글 메시지 매핑
 * 백엔드에서 { error: "ERROR_CODE", message: "..." } 형태로 보냄
 */
export const ERROR_MESSAGES: Record<string, string> = {
  // ==================== 인증 (AUTH_) ====================
  "AUTH_UNAUTHORIZED": "로그인이 필요합니다",
  "AUTH_INVALID_CREDENTIALS": "이메일 또는 비밀번호를 확인해주세요",
  "AUTH_TOKEN_EXPIRED": "로그인이 만료되었습니다. 다시 로그인해주세요",
  "AUTH_TOKEN_INVALID": "잘못된 인증 정보입니다. 다시 로그인해주세요",
  "AUTH_TOKEN_REVOKED": "로그인 세션이 만료되었습니다. 다시 로그인해주세요",
  "AUTH_EMAIL_EXISTS": "이미 사용 중인 이메일입니다",
  "AUTH_NICKNAME_EXISTS": "이미 사용 중인 닉네임입니다",
  "AUTH_PHONE_NOT_VERIFIED": "휴대폰 인증이 필요합니다",
  "AUTH_EMAIL_NOT_VERIFIED": "이메일 인증이 필요합니다",
  "AUTH_CODE_INVALID": "인증번호가 올바르지 않습니다",
  "AUTH_CODE_EXPIRED": "인증번호가 만료되었습니다. 다시 요청해주세요",
  "AUTH_ALREADY_VERIFIED": "이미 인증되었습니다",

  // ==================== 인가/권한 (AUTHZ_) ====================
  "AUTHZ_FORBIDDEN": "접근 권한이 없습니다",
  "AUTHZ_ACCESS_DENIED": "이 작업을 수행할 권한이 없습니다",
  "AUTHZ_ROLE_NOT_FOUND": "권한 정보를 확인할 수 없습니다",
  "AUTHZ_ADMIN_ONLY": "관리자만 접근할 수 있습니다",
  "AUTHZ_OWNER_ONLY": "소유자만 수정할 수 있습니다",

  // ==================== 검증 (VALIDATION_) ====================
  "VALIDATION_INVALID_INPUT": "입력 정보가 올바르지 않습니다",
  "VALIDATION_INVALID_ID": "잘못된 ID입니다",
  "VALIDATION_INVALID_FORMAT": "잘못된 형식입니다",
  "VALIDATION_INVALID_RANGE": "허용 범위를 벗어났습니다",
  "VALIDATION_TOO_SHORT": "입력값이 너무 짧습니다",
  "VALIDATION_TOO_LONG": "입력값이 너무 깁니다",
  "VALIDATION_REQUIRED": "필수 입력 항목입니다",

  // ==================== 리소스 (RESOURCE_) ====================
  "RESOURCE_NOT_FOUND": "요청하신 정보를 찾을 수 없습니다",
  "RESOURCE_ALREADY_EXISTS": "이미 존재합니다",
  "RESOURCE_DELETED": "삭제된 항목입니다",
  "RESOURCE_CONFLICT": "중복된 요청입니다",

  // ==================== 매장 (STORE_) ====================
  "STORE_NOT_FOUND": "매장을 찾을 수 없습니다",
  "STORE_ALREADY_MANAGED": "이미 다른 사용자가 등록한 매장입니다",
  "STORE_ALREADY_OWNED": "이미 매장을 소유하고 있습니다. 한 계정당 하나의 매장만 등록할 수 있습니다",
  "STORE_BUSINESS_NUMBER_EXISTS": "이미 등록된 사업자등록번호입니다",
  "STORE_VERIFICATION_FAILED": "사업자 인증에 실패했습니다",
  "STORE_VERIFICATION_PENDING": "인증 심사가 진행 중입니다",
  "STORE_VERIFICATION_REJECTED": "인증이 반려되었습니다",
  "STORE_ALREADY_VERIFIED": "이미 인증된 매장입니다",

  // ==================== 리뷰 (REVIEW_) ====================
  "REVIEW_NOT_FOUND": "리뷰를 찾을 수 없습니다",
  "REVIEW_INVALID_RATING": "평점은 1-5 사이여야 합니다",
  "REVIEW_TOO_SHORT": "리뷰 내용은 최소 10자 이상이어야 합니다",
  "REVIEW_ALREADY_EXISTS": "이미 리뷰를 작성하셨습니다",

  // ==================== 게시글/댓글 (POST_) ====================
  "POST_NOT_FOUND": "게시글을 찾을 수 없습니다",
  "POST_DELETE_FAILED": "게시글을 삭제할 수 없습니다",
  "POST_EDIT_FAILED": "게시글을 수정할 수 없습니다",
  "POST_INVALID_CATEGORY": "잘못된 카테고리입니다",
  "COMMENT_NOT_FOUND": "댓글을 찾을 수 없습니다",
  "COMMENT_DELETE_FAILED": "댓글을 삭제할 수 없습니다",

  // ==================== 채팅 (CHAT_) ====================
  "CHAT_ROOM_NOT_FOUND": "채팅방을 찾을 수 없습니다",
  "CHAT_MESSAGE_NOT_FOUND": "메시지를 찾을 수 없습니다",
  "CHAT_CANNOT_SEND": "메시지를 전송할 수 없습니다",
  "CHAT_SELF_ROOM_FORBIDDEN": "자기 자신과 채팅할 수 없습니다",
  "CHAT_MESSAGE_DELETED": "이미 삭제된 메시지입니다",
  "CHAT_UPDATE_DELETED": "삭제된 메시지는 수정할 수 없습니다",

  // ==================== 알림 (NOTIFICATION_) ====================
  "NOTIFICATION_NOT_FOUND": "알림을 찾을 수 없습니다",

  // ==================== 업로드 (UPLOAD_) ====================
  "UPLOAD_INVALID_FILE_TYPE": "지원하지 않는 파일 형식입니다",
  "UPLOAD_FILE_TOO_LARGE": "파일 크기가 너무 큽니다",
  "UPLOAD_FAILED": "파일 업로드에 실패했습니다",

  // ==================== 금 시세 (GOLD_) ====================
  "GOLD_PRICE_NOT_FOUND": "금 시세 정보를 찾을 수 없습니다",
  "GOLD_INVALID_TYPE": "잘못된 금 종류입니다",

  // ==================== 비즈니스 로직 (BUSINESS_) ====================
  "BUSINESS_STORE_REQUIRED": "매장 소유권이 필요합니다",
  "BUSINESS_ONE_STORE_PER_USER": "한 계정당 하나의 매장만 등록할 수 있습니다",
  "BUSINESS_QNA_ONLY": "QnA 게시글에만 사용할 수 있습니다",

  // ==================== 내부 오류 (INTERNAL_) ====================
  "INTERNAL_SERVER_ERROR": "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요",
  "INTERNAL_DATABASE_ERROR": "데이터베이스 오류가 발생했습니다",
  "INTERNAL_EXTERNAL_API": "외부 API 연동 중 오류가 발생했습니다",
  "INTERNAL_CONFIG_ERROR": "서버 설정 오류입니다",

  // ==================== 레거시 영문 메시지 (하위 호환) ====================
  // TODO: 백엔드를 모두 에러 코드로 전환한 후 제거 예정
  "Invalid email or password": "이메일 또는 비밀번호를 확인해주세요",
  "Invalid credentials": "이메일 또는 비밀번호를 확인해주세요",
  "Email already exists": "이미 사용 중인 이메일입니다",
  "Nickname already exists": "이미 사용 중인 닉네임입니다",
  "User not found": "사용자를 찾을 수 없습니다",
  "Unauthorized": "로그인이 필요합니다",
  "Invalid or expired refresh token": "로그인이 만료되었습니다. 다시 로그인해주세요",
  "Invalid token": "잘못된 인증 정보입니다",
  "invalid token": "잘못된 인증 정보입니다",
  "Token expired": "로그인이 만료되었습니다. 다시 로그인해주세요",
  "token has expired": "로그인이 만료되었습니다. 다시 로그인해주세요",
  "Store not found": "매장을 찾을 수 없습니다",
  "Phone verification required": "휴대폰 인증이 필요합니다",
};

/**
 * 백엔드 에러 코드/메시지를 한국어로 변환
 * @param errorCode - 백엔드에서 받은 에러 코드 또는 메시지
 * @returns 한글 에러 메시지
 */
export function translateErrorMessage(errorCode: string): string {
  // 1. 에러 코드가 정확히 매핑되면 반환
  if (ERROR_MESSAGES[errorCode]) {
    return ERROR_MESSAGES[errorCode];
  }

  // 2. 레거시 영문 메시지 부분 일치 확인 (대소문자 무시)
  const lowerCode = errorCode.toLowerCase();
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (lowerCode.includes(key.toLowerCase())) {
      return value;
    }
  }

  // 3. 매핑되지 않은 메시지
  // - 백엔드가 이미 한글로 보낸 경우 그대로 반환
  // - 매핑되지 않은 새로운 에러 코드는 경고 로그
  if (errorCode.length > 0 && errorCode !== errorCode.toUpperCase()) {
    // 한글이거나 소문자를 포함하면 이미 사용자 친화적 메시지일 가능성
    return errorCode;
  }

  console.warn(`⚠️ 번역되지 않은 에러 코드: "${errorCode}"`);
  return "오류가 발생했습니다. 잠시 후 다시 시도해주세요";
}
