"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPostAction } from "@/actions/community";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  POST_CATEGORY_LABELS,
  POST_TYPE_LABELS,
  CATEGORY_TYPES,
  ADMIN_ONLY_TYPES,
  type PostCategory,
  type PostType,
  type CreatePostRequest,
} from "@/types/community";

export default function CommunityWritePage() {
  const router = useRouter();
  const { user, tokens } = useAuthStore();

  const [selectedCategory, setSelectedCategory] =
    useState<PostCategory>("gold_trade");
  const [selectedType, setSelectedType] = useState<PostType>("sell_gold");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [goldType, setGoldType] = useState("");
  const [weight, setWeight] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!user || !tokens?.access_token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-6 py-4 rounded-xl max-w-md">
          <span>로그인이 필요합니다.</span>
        </div>
      </div>
    );
  }

  const availableTypes = CATEGORY_TYPES[selectedCategory].filter((type) => {
    if (ADMIN_ONLY_TYPES.includes(type)) {
      return user.role === "admin";
    }
    return true;
  });

  const handleCategoryChange = (category: PostCategory) => {
    setSelectedCategory(category);
    const firstAvailableType = CATEGORY_TYPES[category].find((type) => {
      if (ADMIN_ONLY_TYPES.includes(type)) {
        return user.role === "admin";
      }
      return true;
    });

    if (firstAvailableType) {
      setSelectedType(firstAvailableType);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim() || title.length < 2) {
      newErrors.title = "제목은 최소 2자 이상이어야 합니다.";
    }

    if (!content.trim() || content.length < 10) {
      newErrors.content = "내용은 최소 10자 이상이어야 합니다.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    const requestData: CreatePostRequest = {
      title,
      content,
      category: selectedCategory,
      type: selectedType,
    };

    // 금거래 관련 정보 추가
    if (selectedCategory === "gold_trade") {
      if (goldType) requestData.gold_type = goldType;
      if (weight) requestData.weight = parseFloat(weight);
      if (price) requestData.price = parseInt(price, 10);
      if (location) requestData.location = location;
    }

    const result = await createPostAction(requestData, tokens.access_token);

    if (result.success && result.data) {
      router.push(`/community/posts/${result.data.id}`);
    } else {
      alert(result.error || "게시글 작성에 실패했습니다.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-[900px]">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-8">게시글 작성</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  카테고리 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2 mb-3">
                  {(Object.keys(POST_CATEGORY_LABELS) as PostCategory[]).map(
                    (category) => (
                      <button
                        key={category}
                        type="button"
                        className={`px-4 py-3 rounded-xl text-sm font-semibold border transition-all ${
                          selectedCategory === category
                            ? "bg-gray-900 text-white border-gray-900"
                            : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                        }`}
                        onClick={() => handleCategoryChange(category)}
                      >
                        {POST_CATEGORY_LABELS[category]}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  게시글 타입 <span className="text-red-500">*</span>
                </label>
                <select
                  className={`w-full p-3 rounded-lg border ${
                    errors.type ? "border-red-500" : "border-gray-200"
                  } focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent`}
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as PostType)}
                >
                  {availableTypes.map((type) => (
                    <option key={type} value={type}>
                      {POST_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full p-3 rounded-lg border ${
                    errors.title ? "border-red-500" : "border-gray-200"
                  } focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent`}
                  placeholder="제목을 입력하세요"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                {errors.title && (
                  <p className="mt-2 text-sm text-red-500">{errors.title}</p>
                )}
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  내용 <span className="text-red-500">*</span>
                </label>
                <textarea
                  className={`w-full p-3 rounded-lg border ${
                    errors.content ? "border-red-500" : "border-gray-200"
                  } focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none`}
                  rows={10}
                  placeholder="내용을 입력하세요 (최소 10자)"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                {errors.content && (
                  <p className="mt-2 text-sm text-red-500">{errors.content}</p>
                )}
              </div>

              {/* Gold Trade Additional Fields */}
              {selectedCategory === "gold_trade" && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">
                    금 거래 정보 (선택)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        금 종류
                      </label>
                      <input
                        type="text"
                        className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder="예: 24K, 18K, 14K"
                        value={goldType}
                        onChange={(e) => setGoldType(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        중량 (g)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder="예: 18.75"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        가격 (원)
                      </label>
                      <input
                        type="number"
                        className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder="예: 3500000"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        거래 지역
                      </label>
                      <input
                        type="text"
                        className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder="예: 서울 강남구"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                    </div>
                  </div>

                  {selectedType === "buy_gold" && user.role === "admin" && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        className="stroke-blue-600 shrink-0 w-5 h-5 mt-0.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path>
                      </svg>
                      <p className="text-sm text-blue-700">
                        이 글은 귀하의 매장({user.name})으로 자동 등록됩니다.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-between pt-6 border-t">
                <Link
                  href="/community"
                  className="px-4 py-3 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </Link>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      작성 중...
                    </span>
                  ) : (
                    "게시하기"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
