"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { useApiErrorHandler } from "@/hooks/useApiCall";
import {
  getChatRoomAction,
  getMessagesAction,
  sendMessageAction,
  markAsReadAction,
  joinChatRoomAction,
  leaveChatRoomAction,
  generateChatFilePresignedURLAction,
  updateMessageAction,
  deleteMessageAction,
} from "@/actions/chat";
import {
  reservePostAction,
  cancelReservationAction,
  completeTransactionAction,
} from "@/actions/community";
import { uploadToS3 } from "@/actions/upload";
import type { ChatRoom, Message } from "@/types/chat";
import { Send, ArrowLeft, User, AlertCircle, RotateCw, X, Search, Paperclip, Image as ImageIcon, FileText, Download, Edit2, Trash2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/hooks/useWebSocket";
import { getUserDisplayName, getUserImageUrl } from "@/lib/utils";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import Image from "next/image";

export default function ChatRoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = Number(params.roomId);
  const { user, tokens, isAuthenticated } = useAuthStore();
  const { handleApiError } = useApiErrorHandler();

  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Virtuoso를 맨 아래로 스크롤
  const scrollToBottom = useCallback(() => {
    virtuosoRef.current?.scrollToIndex({
      index: "LAST",
      behavior: "smooth",
    });
  }, []);

  // 검색어 디바운싱 (300ms)
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearchKeyword(searchKeyword);
    }, 300);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchKeyword]);

  // WebSocket connection (인증된 사용자만)
  const wsToken = isAuthenticated && tokens?.access_token ? tokens.access_token : "";
  const { isConnected, sendMessage } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/api/v1/chats/ws',
    token: wsToken,
    onMessage: (data) => {
      if (data.type === "new_message" && data.message) {
        if (data.message.chat_room_id === roomId) {
          // 중복 메시지 방지: 이미 존재하는 메시지는 추가하지 않음
          setMessages((prev) => {
            const messageExists = prev.some((msg) => msg.id === data.message!.id);
            if (messageExists) return prev;

            // 새 메시지를 추가하고 created_at 기준으로 정렬
            const newMessages = [...prev, data.message!];
            return newMessages.sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
          // 새 메시지가 도착하면 자동 스크롤 (다른 사용자의 메시지도 포함)
          setTimeout(() => scrollToBottom(), 100);

          // Mark as read if not my message
          if (data.message.sender_id !== user?.id && tokens?.access_token) {
            markAsReadAction(roomId, tokens.access_token).catch((error) => {
              console.error("Failed to mark message as read:", error);
            });
          }
        }
      } else if (data.type === "read" && data.chat_room_id === roomId) {
        // 상대방이 메시지를 읽음
        if (data.user_id !== user?.id) {
          // 내가 보낸 모든 메시지를 읽음으로 표시
          setMessages((prev) =>
            prev.map((msg) =>
              msg.sender_id === user?.id ? { ...msg, is_read: true } : msg
            )
          );
        }
      } else if (data.type === "typing_start" && data.chat_room_id === roomId) {
        // 상대방이 입력 시작
        if (data.user_id !== user?.id) {
          setIsOtherUserTyping(true);
        }
      } else if (data.type === "typing_stop" && data.chat_room_id === roomId) {
        // 상대방이 입력 중지
        if (data.user_id !== user?.id) {
          setIsOtherUserTyping(false);
        }
      } else if (data.type === "message_updated" && data.message) {
        // 메시지 수정
        if (data.message.chat_room_id === roomId) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === data.message!.id ? data.message! : msg
            )
          );
        }
      } else if (data.type === "message_deleted" && data.message_id) {
        // 메시지 삭제
        if (data.room_id === roomId) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === data.message_id
                ? { ...msg, is_deleted: true, content: "삭제된 메시지입니다" }
                : msg
            )
          );
        }
      }
    },
  });

  useEffect(() => {
    if (!isAuthenticated || !tokens?.access_token) {
      router.push("/login");
      return;
    }

    if (!roomId || isNaN(roomId)) {
      router.push("/chats");
      return;
    }

    let isMounted = true;

    const fetchData = async () => {
      if (!tokens?.access_token) return;

      setIsLoading(true);

      const roomResult = await getChatRoomAction(roomId, tokens.access_token);
      if (!isMounted) return; // Unmount 체크

      if (roomResult.success && roomResult.data) {
        setRoom(roomResult.data.room);
      } else {
        console.error("Failed to fetch chat room:", roomResult.error);
        router.push("/chats");
        return;
      }

      const messagesResult = await getMessagesAction(roomId, tokens.access_token);
      if (!isMounted) return; // Unmount 체크

      if (messagesResult.success && messagesResult.data) {
        const sortedMessages = messagesResult.data.messages.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        setMessages(sortedMessages);
      }

      try {
        await markAsReadAction(roomId, tokens.access_token);
      } catch (error) {
        console.error("Failed to mark messages as read:", error);
      }

      if (isMounted) {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, tokens?.access_token, roomId, router]); // ✅ tokens 대신 tokens?.access_token 사용

  // Join chat room for WebSocket (WebSocket disconnect는 useWebSocket hook에서 자동 처리)
  useEffect(() => {
    if (!tokens?.access_token || !roomId || isNaN(roomId)) return;

    // Join the chat room when entering
    joinChatRoomAction(roomId, tokens.access_token);
  }, [roomId, tokens?.access_token]);

  // 메시지가 로드되거나 업데이트될 때 맨 아래로 스크롤 (초기 로드 시에만)
  useEffect(() => {
    if (messages.length > 0 && !debouncedSearchKeyword) {
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [messages.length]); // messages 대신 messages.length로 변경하여 불필요한 재렌더링 방지

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    // Send typing_start event
    if (value.length === 1) {
      sendMessage({
        type: "typing_start",
        chat_room_id: roomId,
      });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing_stop after 2 seconds of inactivity
    if (value.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        sendMessage({
          type: "typing_stop",
          chat_room_id: roomId,
        });
      }, 2000);
    } else {
      // If input is empty, send typing_stop immediately
      sendMessage({
        type: "typing_stop",
        chat_room_id: roomId,
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !tokens?.access_token || isSending) return;

    // Stop typing indicator
    sendMessage({
      type: "typing_stop",
      chat_room_id: roomId,
    });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setIsSending(true);

    const messageContent = newMessage.trim();
    const tempId = `temp_${Date.now()}_${Math.random()}`;

    // 낙관적 UI 업데이트: 임시 메시지를 즉시 표시
    const tempMessage: Message = {
      id: 0,
      tempId,
      chat_room_id: roomId,
      sender_id: user!.id,
      content: messageContent,
      message_type: "TEXT",
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "pending",
    };

    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage("");
    // 내가 메시지를 보낼 때는 항상 스크롤 (사용자의 의도가 명확함)
    scrollToBottom();
    // 입력창에 다시 포커스
    setTimeout(() => messageInputRef.current?.focus(), 0);

    const result = await sendMessageAction(
      roomId,
      { content: messageContent, message_type: "TEXT" },
      tokens.access_token
    );

    if (result.success && result.data?.message) {
      // 전송 성공: 임시 메시지를 실제 메시지로 교체
      setMessages((prev) =>
        prev.map((msg) =>
          msg.tempId === tempId
            ? { ...result.data!.message, status: "sent" }
            : msg
        ).sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      );
    } else {
      // 전송 실패: 메시지 상태를 failed로 변경
      setMessages((prev) =>
        prev.map((msg) =>
          msg.tempId === tempId
            ? { ...msg, status: "failed", error: result.error || "전송 실패" }
            : msg
        )
      );
      toast.error(result.error || "메시지 전송에 실패했습니다.");
    }

    setIsSending(false);
  };

  // 실패한 메시지 재전송
  const handleRetryMessage = async (message: Message) => {
    if (!tokens?.access_token || !message.tempId) return;

    // 메시지 상태를 pending으로 변경
    setMessages((prev) =>
      prev.map((msg) =>
        msg.tempId === message.tempId
          ? { ...msg, status: "pending", error: undefined }
          : msg
      )
    );

    const result = await sendMessageAction(
      roomId,
      { content: message.content, message_type: message.message_type },
      tokens.access_token
    );

    if (result.success && result.data?.message) {
      // 재전송 성공: 임시 메시지를 실제 메시지로 교체
      setMessages((prev) =>
        prev.map((msg) =>
          msg.tempId === message.tempId
            ? { ...result.data!.message, status: "sent" }
            : msg
        ).sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      );
      toast.success("메시지가 전송되었습니다.");
    } else {
      // 재전송 실패
      setMessages((prev) =>
        prev.map((msg) =>
          msg.tempId === message.tempId
            ? { ...msg, status: "failed", error: result.error || "전송 실패" }
            : msg
        )
      );
      toast.error(result.error || "메시지 재전송에 실패했습니다.");
    }
  };

  // 실패한 메시지 삭제
  const handleDeleteFailedMessage = (tempId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.tempId !== tempId));
  };

  // 파일 선택 처리
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 체크 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("파일 크기는 10MB를 초과할 수 없습니다.");
      return;
    }

    setSelectedFile(file);

    // 이미지 파일인 경우 미리보기 생성
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreviewUrl(null);
    }
  };

  // 파일 선택 취소
  const handleCancelFile = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 파일과 함께 메시지 전송
  const handleSendWithFile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tokens?.access_token || isSending || isUploading) return;
    if (!selectedFile && !newMessage.trim()) return;

    setIsSending(true);
    setIsUploading(true);

    try {
      let fileURL = "";
      let fileName = "";
      let messageType = "TEXT";

      // 파일이 선택된 경우 업로드
      if (selectedFile) {
        // Presigned URL 생성
        const presignedResult = await generateChatFilePresignedURLAction(
          selectedFile.name,
          selectedFile.type,
          tokens.access_token,
          `chat/${roomId}`
        );

        if (!presignedResult.success || !presignedResult.data) {
          toast.error(presignedResult.error || "파일 업로드 URL 생성에 실패했습니다.");
          return;
        }

        // S3에 파일 업로드
        const uploadResult = await uploadToS3(
          presignedResult.data.upload_url,
          selectedFile
        );

        if (!uploadResult.success) {
          toast.error(uploadResult.error || "파일 업로드에 실패했습니다.");
          return;
        }

        fileURL = presignedResult.data.file_url;
        fileName = selectedFile.name;
        messageType = selectedFile.type.startsWith("image/") ? "IMAGE" : "FILE";
      }

      // Stop typing indicator
      sendMessage({
        type: "typing_stop",
        chat_room_id: roomId,
      });
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      const messageContent = newMessage.trim() || (messageType === "IMAGE" ? "이미지" : fileName);
      const tempId = `temp_${Date.now()}_${Math.random()}`;

      // 낙관적 UI 업데이트: 임시 메시지를 즉시 표시
      const tempMessage: Message = {
        id: 0,
        tempId,
        chat_room_id: roomId,
        sender_id: user!.id,
        content: messageContent,
        message_type: messageType as "TEXT" | "IMAGE" | "FILE",
        file_url: fileURL || undefined,
        file_name: fileName || undefined,
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: "pending",
      };

      setMessages((prev) => [...prev, tempMessage]);
      setNewMessage("");
      handleCancelFile();
      scrollToBottom();
      // 입력창에 다시 포커스
      setTimeout(() => messageInputRef.current?.focus(), 0);

      const result = await sendMessageAction(
        roomId,
        {
          content: messageContent,
          message_type: messageType as "TEXT" | "IMAGE" | "FILE",
          file_url: fileURL || undefined,
          file_name: fileName || undefined,
        },
        tokens.access_token
      );

      if (result.success && result.data?.message) {
        // 전송 성공: 임시 메시지를 실제 메시지로 교체
        setMessages((prev) =>
          prev.map((msg) =>
            msg.tempId === tempId
              ? { ...result.data!.message, status: "sent" }
              : msg
          ).sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        );
      } else {
        // 전송 실패: 메시지 상태를 failed로 변경
        setMessages((prev) =>
          prev.map((msg) =>
            msg.tempId === tempId
              ? { ...msg, status: "failed", error: result.error || "전송 실패" }
              : msg
          )
        );
        toast.error(result.error || "메시지 전송에 실패했습니다.");
      }
    } catch (error) {
      toast.error("메시지 전송 중 오류가 발생했습니다.");
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  // 메시지 수정 시작
  const handleStartEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setEditingContent(message.content);
  };

  // 메시지 수정 취소
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent("");
  };

  // 메시지 수정 저장
  const handleSaveEdit = async (messageId: number) => {
    if (!tokens?.access_token) return;
    if (!editingContent.trim()) {
      toast.error("메시지 내용을 입력해주세요.");
      return;
    }

    try {
      const result = await updateMessageAction(
        roomId,
        messageId,
        editingContent.trim(),
        tokens.access_token
      );

      if (result.success && result.data?.message) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? result.data!.message : msg
          )
        );
        toast.success("메시지가 수정되었습니다.");
        handleCancelEdit();
      } else {
        toast.error(result.error || "메시지 수정에 실패했습니다.");
      }
    } catch (error) {
      toast.error("메시지 수정 중 오류가 발생했습니다.");
    }
  };

  // 메시지 삭제
  const handleDeleteMessage = async (messageId: number) => {
    if (!tokens?.access_token) return;

    if (!confirm("메시지를 삭제하시겠습니까?")) return;

    try {
      const result = await deleteMessageAction(
        roomId,
        messageId,
        tokens.access_token
      );

      if (result.success) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, is_deleted: true, content: "삭제된 메시지입니다" }
              : msg
          )
        );
        toast.success("메시지가 삭제되었습니다.");
      } else {
        toast.error(result.error || "메시지 삭제에 실패했습니다.");
      }
    } catch (error) {
      toast.error("메시지 삭제 중 오류가 발생했습니다.");
    }
  };

  // 예약하기 (판매자만)
  const handleReserve = async () => {
    if (!tokens?.access_token || !room?.product || !otherUser?.id) return;

    if (!confirm(`${otherUser.nickname || otherUser.name}님과 거래를 예약하시겠습니까?`)) return;

    try {
      const result = await reservePostAction(
        room.product.id,
        otherUser.id,
        tokens.access_token
      );

      if (result.success) {
        toast.success("게시글이 예약되었습니다.");
        // 채팅방 정보 새로고침
        const roomResult = await getChatRoomAction(roomId, tokens.access_token);
        if (roomResult.success && roomResult.data) {
          setRoom(roomResult.data.room);
        }
      } else {
        toast.error(result.error || "예약에 실패했습니다.");
      }
    } catch (error) {
      toast.error("예약 중 오류가 발생했습니다.");
    }
  };

  // 예약 취소 (판매자만)
  const handleCancelReservation = async () => {
    if (!tokens?.access_token || !room?.product) return;

    if (!confirm("예약을 취소하시겠습니까?")) return;

    try {
      const result = await cancelReservationAction(
        room.product.id,
        tokens.access_token
      );

      if (result.success) {
        toast.success("예약이 취소되었습니다.");
        // 채팅방 정보 새로고침
        const roomResult = await getChatRoomAction(roomId, tokens.access_token);
        if (roomResult.success && roomResult.data) {
          setRoom(roomResult.data.room);
        }
      } else {
        toast.error(result.error || "예약 취소에 실패했습니다.");
      }
    } catch (error) {
      toast.error("예약 취소 중 오류가 발생했습니다.");
    }
  };

  // 거래 완료 (판매자만)
  const handleCompleteTransaction = async () => {
    if (!tokens?.access_token || !room?.product) return;

    if (!confirm("거래를 완료 처리하시겠습니까?")) return;

    try {
      const result = await completeTransactionAction(
        room.product.id,
        tokens.access_token
      );

      if (result.success) {
        toast.success("거래가 완료되었습니다.");
        // 채팅방 정보 새로고침
        const roomResult = await getChatRoomAction(roomId, tokens.access_token);
        if (roomResult.success && roomResult.data) {
          setRoom(roomResult.data.room);
        }
      } else {
        toast.error(result.error || "거래 완료 처리에 실패했습니다.");
      }
    } catch (error) {
      toast.error("거래 완료 처리 중 오류가 발생했습니다.");
    }
  };

  // 검색 필터링된 메시지 (디바운싱된 검색어 사용)
  const filteredMessages = useMemo(() => {
    if (!debouncedSearchKeyword.trim()) return messages;
    return messages.filter((msg) =>
      msg.content.toLowerCase().includes(debouncedSearchKeyword.toLowerCase())
    );
  }, [messages, debouncedSearchKeyword]);

  // 검색어 하이라이트
  const highlightText = (text: string, keyword: string) => {
    if (!keyword.trim()) return text;

    const parts = text.split(new RegExp(`(${keyword})`, "gi"));
    return parts.map((part, index) =>
      part.toLowerCase() === keyword.toLowerCase() ? (
        <mark key={index} className="bg-[#FEF9E7] text-gray-900">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const getOtherUser = () => {
    if (!room || !user) return null;
    const other = room.user1_id === user.id ? room.user2 : room.user1;
    // room.user1 또는 room.user2가 undefined일 수 있으므로 체크
    return other || null;
  };

  // 채팅 타입 레이블 가져오기
  const getChatTypeLabel = (type: ChatRoom["type"]) => {
    switch (type) {
      case "STORE":
        return "매장 문의";
      case "SELL_GOLD":
        return "금 판매 문의";
      case "BUY_GOLD":
        return "금 구매 문의";
      case "SALE":
        return "금 거래 문의"; // 하위 호환성
      default:
        return "대화";
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 top-[80px] bg-gray-50 overflow-hidden">
        <div className="max-w-4xl mx-auto h-full px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 rounded-lg" />
            <div className="h-96 bg-gray-200 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  const otherUser = getOtherUser();

  return (
    <div className="fixed inset-0 top-[80px] bg-gray-50 overflow-hidden">
      <div className="max-w-4xl mx-auto h-full px-4 py-4 flex flex-col">
        {/* Header */}
        <div className="pb-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/chats")}
            className="flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden relative ${
                getUserImageUrl(otherUser || {})
                  ? "bg-white border border-gray-200"
                  : "bg-gradient-to-br from-[#C9A227] to-[#8A6A00]"
              }`}>
                {getUserImageUrl(otherUser || {}) ? (
                  <Image
                    src={getUserImageUrl(otherUser || {}) || "/default-avatar.png"}
                    alt={getUserDisplayName(otherUser || {})}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-gray-900 truncate">
                  {getUserDisplayName(otherUser || {})}
                </h2>
                <p className="text-xs text-gray-600">
                  {room && getChatTypeLabel(room.type)}
                </p>
              </div>
            </div>

            {/* 금 거래 게시글 요약 */}
            {room && room.type === "SALE" && room.product && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">
                      {room.product.title}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {room.product.gold_type && (
                        <span className="text-[10px] bg-white text-gray-700 px-1.5 py-0.5 rounded font-medium">
                          {room.product.gold_type}
                        </span>
                      )}
                      {room.product.weight && (
                        <span className="text-[10px] bg-white text-gray-700 px-1.5 py-0.5 rounded font-medium">
                          {room.product.weight}g
                        </span>
                      )}
                      {room.product.price && (
                        <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-bold">
                          {room.product.price.toLocaleString()}원
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 예약/완료 버튼 (금 판매글의 판매자만 - 금 구매글은 다수 대상 홍보글이므로 예약 불필요) */}
                {user && room.product.user_id === user.id && room.product.type === 'sell_gold' && (
                  <div className="mt-2 flex gap-2">
                    {!room.product.reservation_status || room.product.reservation_status === null ? (
                      /* 판매중 */
                      <button
                        onClick={handleReserve}
                        className="flex-1 px-3 py-1.5 bg-[#C9A227] hover:bg-[#8A6A00] text-gray-900 text-xs font-bold rounded transition-colors"
                      >
                        예약하기
                      </button>
                    ) : room.product.reservation_status === 'reserved' ? (
                      /* 예약중 */
                      <>
                        <button
                          onClick={handleCancelReservation}
                          className="flex-1 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold rounded transition-colors"
                        >
                          예약 취소
                        </button>
                        <button
                          onClick={handleCompleteTransaction}
                          className="flex-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded transition-colors"
                        >
                          거래완료
                        </button>
                      </>
                    ) : null}

                    {/* 상태 표시 */}
                    {room.product.reservation_status === 'reserved' && (
                      <div className="w-full mt-1 text-center">
                        <span className="text-[10px] text-[#8A6A00]">
                          🔒 {room.product.reserved_by_user?.nickname || room.product.reserved_by_user?.name || '구매자'}님과 거래 예약됨
                        </span>
                      </div>
                    )}
                    {room.product.reservation_status === 'completed' && (
                      <div className="w-full text-center">
                        <span className="text-[10px] text-gray-600">
                          ✅ 거래완료
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSearch(!showSearch)}
            className="flex-shrink-0"
          >
            <Search className="w-5 h-5" />
          </Button>

          {isConnected && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              연결됨
            </div>
          )}
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="mt-3">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="메시지 검색..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#C9A227] text-sm"
            />
            {searchKeyword && (
              <div className="mt-2 text-xs text-gray-600">
                {filteredMessages.length}개의 메시지 검색됨
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages - Virtualized */}
      {filteredMessages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-16 text-gray-600">
            <p>{searchKeyword ? "검색 결과가 없습니다." : "메시지를 입력해 대화를 시작하세요."}</p>
          </div>
        </div>
      ) : (
        <Virtuoso
          ref={virtuosoRef}
          data={filteredMessages}
          className="flex-1"
          followOutput="smooth"
          initialTopMostItemIndex={filteredMessages.length > 0 ? filteredMessages.length - 1 : undefined}
          itemContent={(index, message) => {
            const isMine = message.sender_id === user?.id;
            const isFailed = message.status === "failed";
            const isPending = message.status === "pending";

            return (
              <div
                className={`flex ${isMine ? "justify-end" : "justify-start"} items-end gap-2 py-1.5`}
              >
                {/* 실패 시 재전송/삭제 버튼 (왼쪽) */}
                {isMine && isFailed && (
                  <div className="flex items-center gap-1 mb-2">
                    <button
                      onClick={() => handleRetryMessage(message)}
                      className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                      title="재전송"
                    >
                      <RotateCw className="w-4 h-4 text-[#C9A227]" />
                    </button>
                    <button
                      onClick={() => message.tempId && handleDeleteFailedMessage(message.tempId)}
                      className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                      title="삭제"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                )}

                <div
                  className={`group max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 relative ${
                    isMine
                      ? isFailed
                        ? "bg-red-100 text-gray-900"
                        : "bg-[#C9A227] text-gray-900"
                      : "bg-gray-100 text-gray-900"
                  } ${isPending ? "opacity-60" : ""}`}
                >
                  {/* 실패 아이콘 */}
                  {isFailed && (
                    <div className="flex items-center gap-1 mb-1 text-red-600">
                      <AlertCircle className="w-3 h-3" />
                      <span className="text-xs">전송 실패</span>
                    </div>
                  )}

                  {/* 이미지 표시 */}
                  {message.message_type === "IMAGE" && message.file_url && (
                    <div className="mb-2 relative w-full" style={{ maxHeight: "256px" }}>
                      <img
                        src={message.file_url}
                        alt={message.file_name || "이미지"}
                        className="rounded-lg cursor-pointer hover:opacity-90 transition-opacity max-w-full max-h-64 object-contain"
                        onClick={() => window.open(message.file_url, "_blank")}
                      />
                    </div>
                  )}

                  {/* 파일 표시 */}
                  {message.message_type === "FILE" && message.file_url && (
                    <a
                      href={message.file_url}
                      download={message.file_name}
                      className="flex items-center gap-2 p-3 bg-white bg-opacity-50 rounded-lg hover:bg-opacity-70 transition-colors mb-2"
                    >
                      <FileText className="w-5 h-5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {message.file_name}
                        </p>
                      </div>
                      <Download className="w-4 h-4 flex-shrink-0" />
                    </a>
                  )}

                  {/* 텍스트 내용 */}
                  {editingMessageId === message.id ? (
                    // 수정 모드
                    <div className="space-y-2">
                      <textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm resize-none"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(message.id)}
                          className="text-xs"
                        >
                          저장
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                          className="text-xs"
                        >
                          취소
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // 일반 표시 모드
                    <>
                      {(message.message_type === "TEXT" || message.content) && (
                        <div>
                          <p className={`text-sm whitespace-pre-wrap break-words ${message.is_deleted ? "text-gray-400 italic" : ""}`}>
                            {highlightText(message.content, debouncedSearchKeyword)}
                          </p>
                          {message.is_edited && !message.is_deleted && (
                            <span className="text-xs text-gray-600 ml-1">(수정됨)</span>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* 수정/삭제 버튼 (호버 시에만 표시) */}
                  {isMine && !message.is_deleted && editingMessageId !== message.id && !isPending && !isFailed && (
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 bg-white bg-opacity-90 rounded-md shadow-sm p-0.5">
                      <button
                        onClick={() => handleStartEdit(message)}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                        title="수정"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteMessage(message.id)}
                        className="p-1.5 hover:bg-red-50 rounded transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      </button>
                    </div>
                  )}

                  <div
                    className={`flex items-center gap-1 mt-1 text-xs ${
                      isMine ? "text-gray-700" : "text-gray-600"
                    }`}
                  >
                    {isPending ? (
                      <span className="text-gray-600">전송 중...</span>
                    ) : (
                      <>
                        <span>
                          {new Date(message.created_at).toLocaleTimeString(
                            "ko-KR",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                        {isMine && !isFailed && message.is_read && (
                          <span className="text-blue-600 font-medium">읽음</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          }}
          components={{
            Footer: () => isOtherUserTyping ? (
              <div className="flex justify-start py-1.5">
                <div className="bg-gray-100 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            ) : null
          }}
        />
      )}

      {/* Input */}
      <div className="pt-4 border-t border-gray-200 flex-shrink-0">
        {/* File Preview */}
        {selectedFile && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-start gap-3">
              {filePreviewUrl ? (
                <div className="w-20 h-20 rounded overflow-hidden">
                  <img
                    src={filePreviewUrl}
                    alt="미리보기"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-gray-600">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancelFile}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Input Form */}
        <form
          onSubmit={selectedFile ? handleSendWithFile : handleSendMessage}
          className="flex items-center gap-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || isUploading}
            className="flex-shrink-0"
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          <input
            ref={messageInputRef}
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            placeholder={selectedFile ? "메시지 추가 (선택사항)..." : "메시지를 입력하세요..."}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:border-[#C9A227]"
            disabled={isSending || isUploading}
          />

          <Button
            type="submit"
            variant="brand-primary"
            size="icon"
            disabled={(!newMessage.trim() && !selectedFile) || isSending || isUploading}
            className="w-12 h-12 rounded-full flex-shrink-0"
          >
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </form>
      </div>
      </div>
    </div>
  );
}
