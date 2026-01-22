"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { updatePostAction, getPostDetailAction, generateContentAction } from "@/actions/community";
import { getMyStoreAction } from "@/actions/stores";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { ImageUploader } from "@/components/image-uploader";
import { isWebView } from "@/lib/webview";
import {
  POST_CATEGORY_LABELS,
  POST_TYPE_LABELS,
  CATEGORY_TYPES,
  ADMIN_ONLY_TYPES,
  type PostCategory,
  type PostType,
  type CreatePostRequest,
  type UpdatePostRequest,
} from "@/types/community";

export default function CommunityEditPage() {
  const router = useRouter();
  const params = useParams();
  const { user, tokens } = useAuthStore();
  const postId = Number(params?.id);

  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] =
    useState<PostCategory>("gold_trade");
  const [selectedType, setSelectedType] = useState<PostType>("sell_gold");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [goldType, setGoldType] = useState("");
  const [goldTypeUnknown, setGoldTypeUnknown] = useState(false);
  const [weight, setWeight] = useState("");
  const [weightUnknown, setWeightUnknown] = useState(false);
  const [price, setPrice] = useState("");
  const [priceNegotiable, setPriceNegotiable] = useState(false);
  const [location, setLocation] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [showAdditionalNotes, setShowAdditionalNotes] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [inWebView, setInWebView] = useState(false);

  useEffect(() => {
    setInWebView(isWebView());
  }, []);

  // 기존 게시글 데이터 로드
  useEffect(() => {
    const loadPost = async () => {
      if (!tokens?.access_token || !postId) return;

      setIsLoading(true);
      const result = await getPostDetailAction(postId, tokens.access_token);

      if (result.success && result.data) {
        const post = result.data.data;
        setSelectedCategory(post.category);
        setSelectedType(post.type);
        setTitle(post.title);
        setContent(post.content);
        setImageUrls(post.image_urls || []);

        if (post.category === "gold_trade") {
          setGoldType(post.gold_type || "");
          setGoldTypeUnknown(post.gold_type === "알 수 없음");
          setWeight(post.weight ? String(post.weight) : "");
          setWeightUnknown(!post.weight);
          setPrice(post.price ? String(post.price) : "");
          setPriceNegotiable(post.price === 0);
          setLocation(post.location || "");
        }
      } else {
        toast.error("게시글을 불러오는데 실패했습니다.");
        router.push("/community");
      }

      setIsLoading(false);
    };

    loadPost();
  }, [postId, tokens?.access_token, router]);

  if (!user || !tokens?.access_token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-[#FEF9E7] border border-[#C9A227]/30 text-[#8A6A00] px-6 py-4 rounded-xl max-w-md">
          <span>로그인이 필요합니다.</span>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  // 카테고리별로 사용자가 작성 가능한 타입이 있는지 확인
  const isCategoryAvailable = (category: PostCategory) => {
    return CATEGORY_TYPES[category].some((type) => {
      if (ADMIN_ONLY_TYPES.includes(type)) {
        return user.role === "admin";
      }
      return true;
    });
  };

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

    // 금 판매글(sell_gold)일 때 필수 정보 검증
    if (selectedCategory === "gold_trade" && selectedType === "sell_gold") {
      if (imageUrls.length === 0) {
        newErrors.images = "최소 1개 이상의 이미지를 업로드해야 합니다.";
      }

      if (!location.trim()) {
        newErrors.location = "거래 지역은 필수입니다.";
      }

      if (!goldTypeUnknown && !goldType.trim()) {
        newErrors.goldType = "금 종류를 선택하거나 '모름'을 체크해주세요.";
      }

      if (!weightUnknown && !weight.trim()) {
        newErrors.weight = "중량을 입력하거나 '모름'을 체크해주세요.";
      }

      if (!priceNegotiable && !price.trim()) {
        newErrors.price = "가격을 입력하거나 '가격 문의'를 체크해주세요.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // AI 글 자동생성
  const handleGenerateContent = async () => {
    if (!tokens?.access_token) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    if (!title.trim()) {
      toast.error("제목을 먼저 입력해주세요.");
      return;
    }

    // 키워드 추출 (제목 + 추가 설명)
    const keywords = [title.trim()];
    if (additionalNotes.trim()) {
      keywords.push(additionalNotes.trim());
    }

    setIsGenerating(true);

    try {
      const result = await generateContentAction(
        {
          type: selectedType,
          keywords,
          title: title || undefined,
          gold_type: goldType || (goldTypeUnknown ? "알 수 없음" : undefined),
          weight: weight ? parseFloat(weight) : undefined,
          price: price ? parseInt(price, 10) : (priceNegotiable ? 0 : undefined),
          location: location || undefined,
        },
        tokens.access_token
      );

      if (result.success && result.data) {
        setContent(result.data.content);
        toast.success("AI가 글 내용을 생성했습니다!");
      } else {
        toast.error(result.error || "글 생성에 실패했습니다.");
      }
    } catch (error) {
      console.error("Generate content error:", error);
      toast.error("글 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    const requestData: UpdatePostRequest = {
      title,
      content,
    };

    // 금거래 관련 정보 추가
    if (selectedCategory === "gold_trade") {
      // 금 종류: "모름"이면 "알 수 없음"으로 저장, 아니면 입력값
      if (goldTypeUnknown) {
        requestData.gold_type = "알 수 없음";
      } else if (goldType) {
        requestData.gold_type = goldType;
      }

      // 중량: "모름"이면 저장 안 함, 아니면 입력값
      if (!weightUnknown && weight) {
        requestData.weight = parseFloat(weight);
      }

      // 가격: "가격 문의"면 0으로 저장, 아니면 입력값
      if (priceNegotiable) {
        requestData.price = 0;
      } else if (price) {
        requestData.price = parseInt(price, 10);
      }

      if (location) requestData.location = location;
    }

    // 이미지 추가
    if (imageUrls.length > 0) {
      requestData.image_urls = imageUrls;
    }

    const result = await updatePostAction(postId, requestData, tokens.access_token);

    console.log("Update post result:", result);

    if (result.success && result.data) {
      toast.success("게시글이 수정되었습니다.");
      const postSlug = result.data.slug || postId.toString();
      router.push(`/community/posts/${postId}/${postSlug}`);
    } else {
      toast.error(result.error || "게시글 수정에 실패했습니다.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`container mx-auto px-4 max-w-[900px] ${inWebView ? "py-4" : "py-8"}`}>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className={inWebView ? "p-4" : "p-6"}>
            <h2 className={`font-bold ${inWebView ? "text-xl mb-4" : "text-2xl mb-8"}`}>게시글 수정</h2>

            <form onSubmit={handleSubmit} className={inWebView ? "space-y-4" : "space-y-6"}>
              {/* Category Selection */}
              <div>
                <label className={`block font-medium text-gray-700 mb-3 ${inWebView ? "text-xs" : "text-sm"}`}>
                  카테고리 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2 mb-3 flex-wrap">
                  {(Object.keys(POST_CATEGORY_LABELS) as PostCategory[]).map(
                    (category) => {
                      const isAvailable = isCategoryAvailable(category);
                      return (
                        <button
                          key={category}
                          type="button"
                          disabled={!isAvailable}
                          className={`rounded-xl font-semibold border transition-all relative group ${inWebView ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm"} ${
                            !isAvailable
                              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                              : selectedCategory === category
                              ? "bg-[#C9A227] text-white border-[#C9A227] shadow-sm"
                              : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                          }`}
                          onClick={() => isAvailable && handleCategoryChange(category)}
                        >
                          {POST_CATEGORY_LABELS[category]}
                          {!isAvailable && (
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                              관리자만 작성 가능
                            </span>
                          )}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Type Selection */}
              <div>
                <label className={`block font-medium text-gray-700 mb-2 ${inWebView ? "text-xs" : "text-sm"}`}>
                  게시글 타입 <span className="text-red-500">*</span>
                </label>
                <select
                  className={`w-full rounded-lg border ${inWebView ? "p-2.5 text-sm" : "p-3"} ${
                    errors.type ? "border-red-500" : "border-gray-200"
                  } focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent`}
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
                <label className={`block font-medium text-gray-700 mb-2 ${inWebView ? "text-xs" : "text-sm"}`}>
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full rounded-lg border ${inWebView ? "p-2.5 text-sm" : "p-3"} ${
                    errors.title ? "border-red-500" : "border-gray-200"
                  } focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent`}
                  placeholder="제목을 입력하세요"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                {errors.title && (
                  <p className="mt-2 text-sm text-red-500">{errors.title}</p>
                )}
              </div>

              {/* Gold Trade Additional Fields - sell_gold */}
              {selectedCategory === "gold_trade" && selectedType === "sell_gold" && (
                <div className={`border-t ${inWebView ? "pt-4" : "pt-6"}`}>
                  <h3 className={`font-semibold mb-4 ${inWebView ? "text-base" : "text-lg"}`}>
                    금 거래 정보 <span className="text-red-500">*</span>
                  </h3>

                  <div className={`grid grid-cols-1 gap-4 ${inWebView ? "" : "md:grid-cols-2"}`}>
                    {/* 금 종류 */}
                    <div>
                      <label className={`block font-medium text-gray-700 mb-2 ${inWebView ? "text-xs" : "text-sm"}`}>
                        금 종류 <span className="text-red-500">*</span>
                      </label>
                      <select
                        className={`w-full rounded-lg border ${inWebView ? "p-2.5 text-sm" : "p-3"} ${errors.goldType ? "border-red-500" : "border-gray-200"} focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent disabled:bg-gray-100`}
                        value={goldType}
                        onChange={(e) => setGoldType(e.target.value)}
                        disabled={goldTypeUnknown}
                      >
                        <option value="">선택하세요</option>
                        <option value="24K">24K</option>
                        <option value="18K">18K</option>
                        <option value="14K">14K</option>
                        <option value="10K">10K</option>
                        <option value="기타">기타</option>
                      </select>
                      <label className="flex items-center mt-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-[#C9A227] focus:ring-[#C9A227]"
                          checked={goldTypeUnknown}
                          onChange={(e) => {
                            setGoldTypeUnknown(e.target.checked);
                            if (e.target.checked) setGoldType("");
                          }}
                        />
                        <span className={`ml-2 text-gray-600 ${inWebView ? "text-xs" : "text-sm"}`}>모름</span>
                      </label>
                      {errors.goldType && (
                        <p className="mt-1 text-sm text-red-500">{errors.goldType}</p>
                      )}
                    </div>

                    {/* 중량 */}
                    <div>
                      <label className={`block font-medium text-gray-700 mb-2 ${inWebView ? "text-xs" : "text-sm"}`}>
                        중량 (g) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className={`w-full rounded-lg border ${inWebView ? "p-2.5 text-sm" : "p-3"} ${errors.weight ? "border-red-500" : "border-gray-200"} focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent disabled:bg-gray-100`}
                        placeholder="예: 18.75"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        disabled={weightUnknown}
                      />
                      <label className="flex items-center mt-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-[#C9A227] focus:ring-[#C9A227]"
                          checked={weightUnknown}
                          onChange={(e) => {
                            setWeightUnknown(e.target.checked);
                            if (e.target.checked) setWeight("");
                          }}
                        />
                        <span className={`ml-2 text-gray-600 ${inWebView ? "text-xs" : "text-sm"}`}>모름</span>
                      </label>
                      {errors.weight && (
                        <p className="mt-1 text-sm text-red-500">{errors.weight}</p>
                      )}
                    </div>

                    {/* 가격 */}
                    <div>
                      <label className={`block font-medium text-gray-700 mb-2 ${inWebView ? "text-xs" : "text-sm"}`}>
                        가격 (원) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        className={`w-full rounded-lg border ${inWebView ? "p-2.5 text-sm" : "p-3"} ${errors.price ? "border-red-500" : "border-gray-200"} focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent disabled:bg-gray-100`}
                        placeholder={inWebView ? "3500000" : "예: 3500000"}
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        disabled={priceNegotiable}
                      />
                      <label className="flex items-center mt-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-[#C9A227] focus:ring-[#C9A227]"
                          checked={priceNegotiable}
                          onChange={(e) => {
                            setPriceNegotiable(e.target.checked);
                            if (e.target.checked) setPrice("");
                          }}
                        />
                        <span className={`ml-2 text-gray-600 ${inWebView ? "text-xs" : "text-sm"}`}>가격 문의</span>
                      </label>
                      {errors.price && (
                        <p className="mt-1 text-sm text-red-500">{errors.price}</p>
                      )}
                    </div>

                    {/* 거래 지역 */}
                    <div>
                      <label className={`block font-medium text-gray-700 mb-2 ${inWebView ? "text-xs" : "text-sm"}`}>
                        거래 지역 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className={`w-full rounded-lg border ${inWebView ? "p-2.5 text-sm" : "p-3"} ${errors.location ? "border-red-500" : "border-gray-200"} focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent`}
                        placeholder="예: 서울 강남구"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                      {errors.location && (
                        <p className="mt-1 text-sm text-red-500">{errors.location}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Gold Trade Additional Fields - buy_gold (admin only) */}
              {selectedCategory === "gold_trade" && selectedType === "buy_gold" && user.role === "admin" && (
                <div className={`border-t ${inWebView ? "pt-4" : "pt-6"}`}>
                  <div className={`bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3 ${inWebView ? "p-3 mt-2" : "p-4 mt-4"}`}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      className={`stroke-blue-600 shrink-0 mt-0.5 ${inWebView ? "w-4 h-4" : "w-5 h-5"}`}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      ></path>
                    </svg>
                    <p className={`text-blue-700 ${inWebView ? "text-xs" : "text-sm"}`}>
                      이 글은 귀하의 매장({user.name})으로 자동 등록됩니다.
                    </p>
                  </div>
                </div>
              )}

              {/* Content - 옵션 입력 후 마지막에 배치 */}
              <div className={`border-t ${inWebView ? "pt-4" : "pt-6"}`}>
                <div className="flex items-center justify-between mb-3 gap-2">
                  <label className={`block font-medium text-gray-700 ${inWebView ? "text-xs" : "text-sm"}`}>
                    내용 <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateContent}
                    disabled={isGenerating || !title.trim()}
                    className={`flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex-shrink-0 ${inWebView ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"}`}
                  >
                    <Sparkles className={inWebView ? "w-3 h-3" : "w-4 h-4"} />
                    {isGenerating ? "생성중" : "AI 생성"}
                  </button>
                </div>

                {/* AI 생성 추가 설명 입력 (토글) */}
                {!title.trim() && (
                  <p className="text-xs text-gray-500 mb-2">
                    💡 제목과 금 정보를 먼저 입력하면 AI가 내용을 자동으로 생성해드려요
                  </p>
                )}
                {title.trim() && (
                  <div className="mb-3">
                    <button
                      type="button"
                      onClick={() => setShowAdditionalNotes(!showAdditionalNotes)}
                      className={`text-purple-600 hover:text-purple-700 flex items-center gap-1 ${inWebView ? "text-xs" : "text-sm"}`}
                    >
                      <span>{showAdditionalNotes ? "▼" : "▶"}</span>
                      <span>추가 강조 내용 (선택)</span>
                    </button>
                    {showAdditionalNotes && (
                      <div className={`mt-2 bg-purple-50 border border-purple-200 rounded-lg ${inWebView ? "p-2" : "p-3"}`}>
                        <textarea
                          className={`w-full rounded border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none ${inWebView ? "p-2 text-xs" : "p-2 text-sm"}`}
                          rows={2}
                          placeholder="예: 급하게 팔아야 해서 가격 협상 가능합니다"
                          value={additionalNotes}
                          onChange={(e) => setAdditionalNotes(e.target.value)}
                        />
                        <p className="text-xs text-purple-600 mt-1">
                          💬 이 내용이 AI 생성 시 반영됩니다
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <textarea
                  className={`w-full rounded-lg border ${inWebView ? "p-2.5 text-sm" : "p-3"} ${
                    errors.content ? "border-red-500" : "border-gray-200"
                  } focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent resize-none`}
                  rows={inWebView ? 8 : 10}
                  placeholder="내용을 입력하세요 (최소 10자)"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                {errors.content && (
                  <p className="mt-2 text-sm text-red-500">{errors.content}</p>
                )}
              </div>

              {/* 이미지 업로드 - 모든 카테고리에서 사용 가능 */}
              <div className={`border-t ${inWebView ? "pt-4" : "pt-6"}`}>
                <label className={`block font-medium text-gray-700 mb-2 ${inWebView ? "text-xs" : "text-sm"}`}>
                  이미지 {selectedCategory === "gold_trade" && selectedType === "sell_gold" && <span className="text-red-500">*</span>}
                </label>
                <ImageUploader
                  imageUrls={imageUrls}
                  onImagesChange={setImageUrls}
                  maxImages={5}
                  accessToken={tokens.access_token}
                  folder="community"
                />
                {errors.images && (
                  <p className="mt-2 text-sm text-red-500">{errors.images}</p>
                )}
              </div>

              {/* Submit Buttons */}
              <div className={`flex items-center justify-between border-t gap-3 ${inWebView ? "pt-4" : "pt-6"}`}>
                <Link
                  href="/community"
                  className={`border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors ${inWebView ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm"}`}
                >
                  취소
                </Link>
                <button
                  type="submit"
                  className={`bg-[#C9A227] hover:bg-[#8A6A00] text-white font-semibold rounded-xl shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${inWebView ? "px-5 py-2 text-xs" : "px-6 py-3 text-sm"}`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className={`inline-block border-2 border-white border-t-transparent rounded-full animate-spin ${inWebView ? "w-3 h-3" : "w-4 h-4"}`}></span>
                      수정중...
                    </span>
                  ) : (
                    "수정하기"
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
