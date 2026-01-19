"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Upload, FileImage, X } from "lucide-react";
import { toast } from "sonner";
import { submitVerificationAction } from "@/actions/stores";
import { getPresignedUrlAction, uploadToS3 } from "@/actions/upload";
import { useAuthStore } from "@/stores/useAuthStore";
import Image from "next/image";

interface StoreVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function StoreVerificationModal({
  open,
  onOpenChange,
  onSuccess,
}: StoreVerificationModalProps) {
  const { tokens } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 파일 선택 핸들러
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tokens?.access_token) return;

    // 파일 크기 제한 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("파일 크기는 10MB 이하여야 합니다.");
      return;
    }

    // 이미지 파일 타입 체크
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드 가능합니다.");
      return;
    }

    setUploading(true);

    try {
      // 1. Presigned URL 가져오기
      const presignedResult = await getPresignedUrlAction(
        {
          filename: file.name,
          content_type: file.type,
          file_size: file.size,
          folder: "verifications",
        },
        tokens.access_token
      );

      if (!presignedResult.success || !presignedResult.data) {
        throw new Error(presignedResult.error || "업로드 URL 생성 실패");
      }

      const { upload_url, file_url } = presignedResult.data;

      // 2. S3에 파일 업로드
      const uploadResult = await uploadToS3(upload_url, file);

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "파일 업로드 실패");
      }

      setImageUrl(file_url);
      toast.success("이미지가 업로드되었습니다.");
    } catch (error) {
      console.error("File upload error:", error);
      toast.error(error instanceof Error ? error.message : "파일 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 이미지 삭제
  const handleRemoveImage = () => {
    setImageUrl(null);
  };

  // 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tokens?.access_token) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    if (!imageUrl) {
      toast.error("사업자등록증 이미지를 업로드해주세요.");
      return;
    }

    setLoading(true);

    try {
      const result = await submitVerificationAction(
        { business_license_url: imageUrl },
        tokens.access_token
      );

      if (result.success && result.data) {
        toast.success("인증 신청이 완료되었습니다. 검토 후 승인됩니다.");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error || "인증 신청에 실패했습니다.");
      }
    } catch (error) {
      console.error("Submit verification error:", error);
      toast.error("인증 신청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>매장 인증 신청</DialogTitle>
          <DialogDescription>
            사업자등록증을 업로드하여 매장 인증을 완료하세요.
            인증이 완료되면 &quot;인증 매장&quot; 뱃지가 표시됩니다.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            업로드된 사업자등록증은 관리자 검토 후 승인됩니다.
            심사는 보통 1-2 영업일 이내에 완료됩니다.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 이미지 업로드 영역 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              사업자등록증 이미지 <span className="text-red-500">*</span>
            </label>

            {imageUrl ? (
              <div className="relative border rounded-lg overflow-hidden">
                <div className="aspect-[4/3] relative">
                  <Image
                    src={imageUrl}
                    alt="사업자등록증"
                    fill
                    className="object-contain bg-gray-50"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
                    <p className="text-sm text-gray-500">업로드 중...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <FileImage className="w-10 h-10 text-gray-400" />
                    <p className="text-sm text-gray-600 font-medium">
                      클릭하여 이미지 업로드
                    </p>
                    <p className="text-xs text-gray-500">
                      JPG, PNG (최대 10MB)
                    </p>
                  </div>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploading}
            />
          </div>

          {/* 안내 사항 */}
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-1">
            <p className="font-medium text-gray-900">인증 시 혜택</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li>매장 프로필에 &quot;인증 매장&quot; 뱃지 표시</li>
              <li>검색 결과에서 우선 노출</li>
              <li>고객 신뢰도 향상</li>
            </ul>
          </div>

          {/* 제출 버튼 */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={loading || !imageUrl}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  인증 신청
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
