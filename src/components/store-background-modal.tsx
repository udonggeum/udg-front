"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, Image as ImageIcon, Palette, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { StoreBackground } from "@/components/store-background";
import type { StoreBackground as StoreBackgroundType } from "@/types/stores";
import {
  COLOR_OPTIONS,
  PATTERN_OPTIONS,
  PRESET_BACKGROUNDS,
} from "@/constants/store-backgrounds";
import { getPresignedUrlAction, uploadToS3 } from "@/actions/upload";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";

type TabType = "image" | "preset" | "color";

interface StoreBackgroundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBackground?: StoreBackgroundType;
  onSave: (background: StoreBackgroundType) => Promise<void>;
}

export function StoreBackgroundModal({
  open,
  onOpenChange,
  currentBackground,
  onSave,
}: StoreBackgroundModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("preset");
  const [selectedBackground, setSelectedBackground] = useState<StoreBackgroundType | null>(
    currentBackground || null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 색상+패턴 탭용 상태
  const [selectedColor, setSelectedColor] = useState<string>("gold");
  const [selectedPattern, setSelectedPattern] = useState<string>("none");

  // 모달이 열릴 때 현재 배경으로 초기화
  useEffect(() => {
    if (open) {
      if (currentBackground) {
        setSelectedBackground(currentBackground);

        // 탭 및 선택값 초기화
        if (currentBackground.type === "image") {
          setActiveTab("image");
        } else if (currentBackground.type === "preset") {
          setActiveTab("preset");
        } else if (currentBackground.type === "color") {
          setActiveTab("color");
          setSelectedColor(currentBackground.value);
          setSelectedPattern(currentBackground.pattern || "none");
        }
      } else {
        setActiveTab("preset");
        setSelectedBackground({ type: "preset", value: "default" });
      }
    }
  }, [open, currentBackground]);

  // 색상 선택 시 배경 업데이트
  const handleColorSelect = (colorId: string) => {
    setSelectedColor(colorId);
    setSelectedBackground({
      type: "color",
      value: colorId,
      pattern: selectedPattern,
    });
  };

  // 패턴 선택 시 배경 업데이트
  const handlePatternSelect = (patternId: string) => {
    setSelectedPattern(patternId);
    setSelectedBackground({
      type: "color",
      value: selectedColor,
      pattern: patternId,
    });
  };

  // 프리셋 선택
  const handlePresetSelect = (presetId: string) => {
    setSelectedBackground({
      type: "preset",
      value: presetId,
    });
  };

  // 이미지 업로드
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const { tokens } = useAuthStore.getState();

    if (!file || !tokens?.access_token) return;

    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("파일 크기는 5MB 이하여야 합니다.");
      return;
    }

    // 이미지 파일 타입 체크
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드 가능합니다.");
      return;
    }

    setIsUploading(true);

    try {
      // 1. Presigned URL 가져오기
      const presignedResult = await getPresignedUrlAction(
        {
          filename: file.name,
          content_type: file.type,
          file_size: file.size,
        },
        tokens.access_token
      );

      if (!presignedResult.success || !presignedResult.data) {
        throw new Error(presignedResult.error || "Presigned URL 생성 실패");
      }

      const { upload_url, file_url } = presignedResult.data;

      // 2. S3에 파일 업로드
      const uploadResult = await uploadToS3(upload_url, file);

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "파일 업로드 실패");
      }

      // 3. 배경 설정
      setSelectedBackground({
        type: "image",
        value: file_url,
      });

      toast.success("이미지가 업로드되었습니다.");
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error(error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 저장
  const handleSave = async () => {
    if (!selectedBackground) return;

    setIsSaving(true);
    try {
      await onSave(selectedBackground);
      onOpenChange(false);
    } catch (error) {
      console.error("Save background error:", error);
      toast.error("배경 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: "image" as const, label: "이미지 업로드", icon: Upload },
    { id: "preset" as const, label: "프리셋", icon: ImageIcon },
    { id: "color" as const, label: "색상+패턴", icon: Palette },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>배경 설정</DialogTitle>
        </DialogHeader>

        {/* 탭 네비게이션 */}
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-[#C9A227] border-b-2 border-[#C9A227]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        <div className="flex-1 overflow-y-auto py-4 min-h-[300px]">
          {/* 이미지 업로드 탭 */}
          {activeTab === "image" && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  isUploading
                    ? "border-[#C9A227] bg-[#FEF9E7]"
                    : "border-gray-300 hover:border-[#C9A227] hover:bg-[#FEF9E7]/50"
                }`}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-2 border-[#C9A227] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-600">업로드 중...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-1">
                      클릭하여 이미지를 업로드하세요
                    </p>
                    <p className="text-xs text-gray-400">
                      PNG, JPG, WEBP (최대 5MB)
                    </p>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={isUploading}
              />

              {/* 업로드된 이미지 미리보기 */}
              {selectedBackground?.type === "image" && selectedBackground.value && (
                <div className="relative rounded-xl overflow-hidden">
                  <img
                    src={selectedBackground.value}
                    alt="업로드된 배경"
                    className="w-full h-40 object-cover"
                  />
                  <button
                    onClick={() => setSelectedBackground(null)}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 프리셋 탭 */}
          {activeTab === "preset" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PRESET_BACKGROUNDS.map((preset) => {
                const isSelected =
                  selectedBackground?.type === "preset" &&
                  selectedBackground.value === preset.id;

                return (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetSelect(preset.id)}
                    className={`relative rounded-xl overflow-hidden transition-all ${
                      isSelected
                        ? "ring-2 ring-[#C9A227] ring-offset-2"
                        : "hover:ring-2 hover:ring-gray-300 hover:ring-offset-1"
                    }`}
                  >
                    <div
                      className="h-20 w-full"
                      style={{ background: preset.thumbnail }}
                    />
                    <div className="p-2 bg-white border-t border-gray-100">
                      <span className="text-xs font-medium text-gray-700">
                        {preset.label}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-[#C9A227] rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* 색상+패턴 탭 */}
          {activeTab === "color" && (
            <div className="space-y-6">
              {/* 색상 선택 */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">색상</h4>
                <div className="grid grid-cols-4 gap-3">
                  {COLOR_OPTIONS.map((color) => {
                    const isSelected = selectedColor === color.id;

                    return (
                      <button
                        key={color.id}
                        onClick={() => handleColorSelect(color.id)}
                        className={`relative rounded-xl overflow-hidden transition-all ${
                          isSelected
                            ? "ring-2 ring-[#C9A227] ring-offset-2"
                            : "hover:ring-2 hover:ring-gray-300 hover:ring-offset-1"
                        }`}
                      >
                        <div
                          className="h-14 w-full"
                          style={{
                            background: `linear-gradient(135deg, ${color.from}, ${color.to})`,
                          }}
                        />
                        <div className="p-1.5 bg-white border-t border-gray-100">
                          <span className="text-xs font-medium text-gray-700">
                            {color.label}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#C9A227] rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 패턴 선택 */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">패턴</h4>
                <div className="flex flex-wrap gap-2">
                  {PATTERN_OPTIONS.map((pattern) => {
                    const isSelected = selectedPattern === pattern.id;

                    return (
                      <button
                        key={pattern.id}
                        onClick={() => handlePatternSelect(pattern.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isSelected
                            ? "bg-[#C9A227] text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {pattern.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 미리보기 */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">미리보기</h4>
          <div className="rounded-xl overflow-hidden border border-gray-200">
            <StoreBackground
              background={selectedBackground || undefined}
              className="h-24"
            />
          </div>
        </div>

        {/* 푸터 */}
        <DialogFooter className="pt-4 border-t border-gray-200">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedBackground || isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-[#C9A227] hover:bg-[#8A6A00] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default StoreBackgroundModal;
