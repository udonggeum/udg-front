"use client";

import { useState, useEffect } from "react";
import { X, Check, Tag as TagIcon, Sparkles } from "lucide-react";
import type { Tag, TagsByCategory } from "@/types/tags";

interface TagEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  allTags: Tag[];
  selectedTagIds: number[];
  onSave: (tagIds: number[]) => Promise<void>;
}

export default function TagEditModal({
  isOpen,
  onClose,
  allTags,
  selectedTagIds,
  onSave,
}: TagEditModalProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>(selectedTagIds);
  const [isSaving, setIsSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // 태그를 카테고리별로 그룹화
  const tagsByCategory: TagsByCategory = allTags.reduce((acc, tag) => {
    if (!acc[tag.category]) {
      acc[tag.category] = [];
    }
    acc[tag.category].push(tag);
    return acc;
  }, {} as TagsByCategory);

  const categories = Object.keys(tagsByCategory);

  // 모달이 열릴 때 selectedTagIds 동기화
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(selectedTagIds);
      // 첫 번째 카테고리를 기본 활성화
      if (categories.length > 0 && !activeCategory) {
        setActiveCategory(categories[0]);
      }
    }
  }, [isOpen, selectedTagIds]);

  // 태그 선택/해제
  const toggleTag = (tagId: number) => {
    setSelectedIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  // 저장 핸들러
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(selectedIds);
      onClose();
    } catch (error) {
      console.error("Failed to save tags:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // 모달이 닫혀있으면 렌더링하지 않음
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#C9A227] to-[#C9A227] rounded-2xl flex items-center justify-center shadow-lg shadow-[#C9A227]/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">매장 태그 편집</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  매장에 어울리는 태그를 선택해주세요 ({selectedIds.length}개 선택)
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="absolute top-5 right-6 w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Category Tabs */}
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {categories.map((category) => {
                const categoryTags = tagsByCategory[category];
                const selectedCount = categoryTags.filter((tag) =>
                  selectedIds.includes(tag.id)
                ).length;

                return (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                      activeCategory === category
                        ? "bg-gray-900 text-white shadow-lg shadow-gray-900/20"
                        : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    {category}
                    {selectedCount > 0 && (
                      <span
                        className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                          activeCategory === category
                            ? "bg-white/20 text-white"
                            : "bg-[#C9A227] text-gray-900"
                        }`}
                      >
                        {selectedCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags Grid */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {activeCategory && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {tagsByCategory[activeCategory].map((tag) => {
                  const isSelected = selectedIds.includes(tag.id);

                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`relative px-4 py-3.5 rounded-2xl text-sm font-medium transition-all group ${
                        isSelected
                          ? "bg-gradient-to-br from-[#C9A227] to-[#C9A227] text-gray-900 shadow-lg shadow-[#C9A227]/30 scale-[1.02]"
                          : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <TagIcon
                            className={`w-4 h-4 flex-shrink-0 ${
                              isSelected ? "text-gray-900" : "text-gray-400"
                            }`}
                          />
                          <span className="truncate">{tag.name}</span>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 text-[#C9A227]" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Empty state */}
            {activeCategory && tagsByCategory[activeCategory].length === 0 && (
              <div className="text-center py-page">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TagIcon className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">이 카테고리에는 태그가 없습니다</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 px-5 py-3.5 bg-white hover:bg-gray-50 text-gray-900 font-semibold rounded-xl border-2 border-gray-200 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-5 py-3.5 bg-gradient-to-r from-[#C9A227] to-[#C9A227] hover:from-[#8A6A00] hover:to-[#8A6A00] text-gray-900 font-semibold rounded-xl shadow-lg shadow-[#C9A227]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "저장 중..." : "저장하기"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}
