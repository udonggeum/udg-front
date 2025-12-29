"use client";

import { useState, useRef } from "react";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import { generatePresignedURLAction, uploadFileToS3 } from "@/actions/upload";
import { toast } from "sonner";

interface ImageUploaderProps {
  imageUrls: string[];
  onImagesChange: (urls: string[]) => void;
  maxImages?: number;
  accessToken: string;
  folder?: string;
}

export function ImageUploader({
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (imageUrls.length + files.length > maxImages) {
      toast.error(`최대 ${maxImages}개까지 업로드할 수 있습니다.`);
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name}: 지원하지 않는 파일 형식입니다. (JPG, PNG, GIF, WEBP만 가능)`);
        return;
      }
      if (file.size > maxSize) {
        toast.error(`${file.name}: 파일 크기는 10MB 이하여야 합니다.`);
        return;
      }
    }

    setUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of files) {
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
      }

      if (uploadedUrls.length > 0) {
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

  const handleClickUpload = () => {
    fileInputRef.current?.click();
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
          JPG, PNG, GIF, WEBP 파일 (최대 10MB, {maxImages}개까지)
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
              className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group"
            >
              <img
                src={url}
                alt={`업로드 이미지 ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-red-500 hover:bg-red-600 text-white rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
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
