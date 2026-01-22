"use client";

import { useState, useRef, useEffect, memo } from "react";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import { generatePresignedURLAction, uploadFileToS3 } from "@/actions/upload";
import { toast } from "sonner";
import { isWebView, postMessageToNative, onMessageFromNative } from "@/lib/webview";

interface ImageUploaderProps {
  imageUrls: string[];
  onImagesChange: (urls: string[]) => void;
  maxImages?: number;
  accessToken: string;
  folder?: string;
}

function ImageUploaderComponent({
  imageUrls,
  onImagesChange,
  maxImages = 5,
  accessToken,
  folder = "community",
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inWebView = isWebView();

  // WebView에서 네이티브 이미지 선택 이벤트 수신
  useEffect(() => {
    if (!inWebView) return;

    const cleanup = onMessageFromNative((event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'IMAGE_SELECTED' && data.images) {
          // 네이티브에서 선택한 이미지 처리
          handleNativeImages(data.images);
        }
      } catch (error) {
        console.error('[ImageUploader] Failed to parse native message:', error);
      }
    });

    return cleanup;
  }, [inWebView, imageUrls, maxImages, accessToken]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (imageUrls.length + files.length > maxImages) {
      toast.error(`최대 ${maxImages}개까지 업로드할 수 있습니다.`);
      return;
    }

    const maxSize = 20 * 1024 * 1024; // 20MB로 증가
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name}: 지원하지 않는 파일 형식입니다. (JPG, PNG, GIF, WEBP만 가능)`);
        return;
      }
      if (file.size > maxSize) {
        toast.error(`${file.name}: 파일 크기는 20MB 이하여야 합니다.`);
        return;
      }
    }

    setUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));

        const presignedResult = await generatePresignedURLAction(
          {
            filename: file.name,
            content_type: file.type,
            file_size: file.size,
            folder,
          },
          accessToken
        );

        if (!presignedResult.success || !presignedResult.data) {
          toast.error(`${file.name}: URL 생성 실패`);
          continue;
        }

        setUploadProgress((prev) => ({ ...prev, [file.name]: 50 }));

        const uploadResult = await uploadFileToS3(
          presignedResult.data.upload_url,
          file
        );

        if (!uploadResult.success) {
          toast.error(`${file.name}: 업로드 실패`);
          continue;
        }

        setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
        uploadedUrls.push(presignedResult.data.file_url);
        console.log("✅ Uploaded:", file.name, "→", presignedResult.data.file_url);
      }

      if (uploadedUrls.length > 0) {
        console.log("📤 All uploaded URLs:", uploadedUrls);
        // 기존 이미지에 새로 업로드된 URL 추가
        onImagesChange([...imageUrls, ...uploadedUrls]);
        toast.success(`${uploadedUrls.length}개 이미지가 업로드되었습니다.`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
      setUploadProgress({});
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    const newUrls = imageUrls.filter((_, i) => i !== index);
    onImagesChange(newUrls);
  };

  // 네이티브에서 받은 이미지 처리 (Base64 또는 URL)
  const handleNativeImages = async (images: Array<{ uri: string; name?: string; type?: string }>) => {
    if (imageUrls.length + images.length > maxImages) {
      toast.error(`최대 ${maxImages}개까지 업로드할 수 있습니다.`);
      return;
    }

    setUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (const image of images) {
        const filename = image.name || `image-${Date.now()}.jpg`;
        setUploadProgress((prev) => ({ ...prev, [filename]: 0 }));

        // Base64를 Blob으로 변환
        const response = await fetch(image.uri);
        const blob = await response.blob();
        const file = new File([blob], filename, { type: image.type || 'image/jpeg' });

        const presignedResult = await generatePresignedURLAction(
          {
            filename: file.name,
            content_type: file.type,
            file_size: file.size,
            folder,
          },
          accessToken
        );

        if (!presignedResult.success || !presignedResult.data) {
          toast.error(`${filename}: URL 생성 실패`);
          continue;
        }

        setUploadProgress((prev) => ({ ...prev, [filename]: 50 }));

        const uploadResult = await uploadFileToS3(
          presignedResult.data.upload_url,
          file
        );

        if (!uploadResult.success) {
          toast.error(`${filename}: 업로드 실패`);
          continue;
        }

        setUploadProgress((prev) => ({ ...prev, [filename]: 100 }));
        uploadedUrls.push(presignedResult.data.file_url);
      }

      if (uploadedUrls.length > 0) {
        onImagesChange([...imageUrls, ...uploadedUrls]);
        toast.success(`${uploadedUrls.length}개 이미지가 업로드되었습니다.`);
      }
    } catch (error) {
      console.error("Native image upload error:", error);
      toast.error("이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  const handleClickUpload = () => {
    if (inWebView) {
      // WebView: 네이티브 이미지 피커 호출
      postMessageToNative('PICK_IMAGE', {
        maxImages: maxImages - imageUrls.length,
        maxSize: 20 * 1024 * 1024,
        quality: 0.85,
        allowMultiple: maxImages > 1
      });
    } else {
      // 웹: 일반 파일 입력
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={handleClickUpload}
          disabled={uploading || imageUrls.length >= maxImages}
          className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-gray-600"
        >
          <Upload className="w-5 h-5" />
          <span className="text-sm font-medium">
            {uploading
              ? "업로드 중..."
              : `이미지 선택 (${imageUrls.length}/${maxImages})`}
          </span>
        </button>
        <p className="mt-2 text-xs text-gray-500">
          JPG, PNG, GIF, WEBP 파일 (최대 20MB, {maxImages}개까지)
        </p>
      </div>

      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([filename, progress]) => (
            <div key={filename} className="flex items-center gap-2">
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span className="truncate">{filename}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {imageUrls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {imageUrls.map((url, index) => (
            <div
              key={url}
              className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50 group"
            >
              <img
                src={url}
                alt={`업로드 이미지 ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error("이미지 로드 실패:", url);
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div class="flex flex-col items-center justify-center h-full text-red-500">
                        <svg class="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p class="text-xs">로드 실패</p>
                      </div>
                    `;
                  }
                }}
                onLoad={() => {
                  console.log("이미지 로드 성공:", url);
                }}
                loading="lazy"
              />
              {/* 삭제 버튼 */}
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg z-10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {imageUrls.length === 0 && !uploading && (
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
          <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            아직 업로드된 이미지가 없습니다
          </p>
        </div>
      )}
    </div>
  );
}

export const ImageUploader = memo(ImageUploaderComponent);
