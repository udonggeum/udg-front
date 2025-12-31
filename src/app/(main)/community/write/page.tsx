"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPostAction, generateContentAction } from "@/actions/community";
import { getMyStoreAction } from "@/actions/stores";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { ImageUploader } from "@/components/image-uploader";
import { KOREA_REGIONS } from "@/lib/regions";
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
  const [goldTypeUnknown, setGoldTypeUnknown] = useState(false);
  const [weight, setWeight] = useState("");
  const [weightUnknown, setWeightUnknown] = useState(false);
  const [price, setPrice] = useState("");
  const [priceNegotiable, setPriceNegotiable] = useState(false);
  const [location, setLocation] = useState("");
  const [region, setRegion] = useState("");
  const [district, setDistrict] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [showAdditionalNotes, setShowAdditionalNotes] = useState(false);
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

  // Admin 사용자가 매장 관련 게시글 작성 시 매장 주소 자동 입력
  useEffect(() => {
    const loadStoreLocation = async () => {
      // Admin이고 매장 주인만 작성 가능한 타입일 때
      if (user.role === "admin" && ADMIN_ONLY_TYPES.includes(selectedType) && tokens?.access_token) {
        try {
          const result = await getMyStoreAction(tokens.access_token);
          if (result.success && result.data?.store) {
            const storeRegion = result.data.store.region || "";
            const storeDistrict = result.data.store.district || "";

            // region과 district를 각각 저장
            setRegion(storeRegion);
            setDistrict(storeDistrict);

            // location에도 설정 (금거래용)
            const storeLocation = `${storeRegion} ${storeDistrict}`;
            setLocation(storeLocation);
          }
        } catch (error) {
          // 에러는 조용히 무시 (매장이 없을 수도 있음)
          console.error("Failed to load store location:", error);
        }
      }
    };

    loadStoreLocation();
  }, [user.role, selectedType, tokens?.access_token]);

  // region과 district가 변경되면 location 자동 업데이트
  useEffect(() => {
    if (region && district) {
      setLocation(`${region} ${district}`);
    } else {
      setLocation("");
    }
  }, [region, district]);

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

    const requestData: CreatePostRequest = {
      title,
      content,
      category: selectedCategory,
      type: selectedType,
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

      // sell_gold의 경우 알림을 위해 region, district도 전송
      if (selectedType === "sell_gold" && region && district) {
        requestData.region = region;
        requestData.district = district;
      }
    }

    // 매장 관련 게시글(ADMIN_ONLY_TYPES)의 경우 region, district 추가
    if (ADMIN_ONLY_TYPES.includes(selectedType)) {
      if (region) requestData.region = region;
      if (district) requestData.district = district;
    }

    // 이미지 추가
    if (imageUrls.length > 0) {
      requestData.image_urls = imageUrls;
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
                    (category) => {
                      const isAvailable = isCategoryAvailable(category);
                      return (
                        <button
                          key={category}
                          type="button"
                          disabled={!isAvailable}
                          className={`px-4 py-3 rounded-xl text-sm font-semibold border transition-all relative group ${
                            !isAvailable
                              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                              : selectedCategory === category
                              ? "bg-gray-900 text-white border-gray-900"
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

              {/* Gold Trade Additional Fields - sell_gold */}
              {selectedCategory === "gold_trade" && selectedType === "sell_gold" && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">
                    금 거래 정보 <span className="text-red-500">*</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 금 종류 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        금 종류 <span className="text-red-500">*</span>
                      </label>
                      <select
                        className={`w-full p-3 rounded-lg border ${errors.goldType ? "border-red-500" : "border-gray-200"} focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100`}
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
                          className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                          checked={goldTypeUnknown}
                          onChange={(e) => {
                            setGoldTypeUnknown(e.target.checked);
                            if (e.target.checked) setGoldType("");
                          }}
                        />
                        <span className="ml-2 text-sm text-gray-600">모름</span>
                      </label>
                      {errors.goldType && (
                        <p className="mt-1 text-sm text-red-500">{errors.goldType}</p>
                      )}
                    </div>

                    {/* 중량 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        중량 (g) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className={`w-full p-3 rounded-lg border ${errors.weight ? "border-red-500" : "border-gray-200"} focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100`}
                        placeholder="예: 18.75"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        disabled={weightUnknown}
                      />
                      <label className="flex items-center mt-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                          checked={weightUnknown}
                          onChange={(e) => {
                            setWeightUnknown(e.target.checked);
                            if (e.target.checked) setWeight("");
                          }}
                        />
                        <span className="ml-2 text-sm text-gray-600">모름</span>
                      </label>
                      {errors.weight && (
                        <p className="mt-1 text-sm text-red-500">{errors.weight}</p>
                      )}
                    </div>

                    {/* 가격 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        가격 (원) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        className={`w-full p-3 rounded-lg border ${errors.price ? "border-red-500" : "border-gray-200"} focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100`}
                        placeholder="예: 3500000"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        disabled={priceNegotiable}
                      />
                      <label className="flex items-center mt-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                          checked={priceNegotiable}
                          onChange={(e) => {
                            setPriceNegotiable(e.target.checked);
                            if (e.target.checked) setPrice("");
                          }}
                        />
                        <span className="ml-2 text-sm text-gray-600">가격 문의</span>
                      </label>
                      {errors.price && (
                        <p className="mt-1 text-sm text-red-500">{errors.price}</p>
                      )}
                    </div>

                    {/* 거래 지역 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        거래 지역 <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <select
                          value={region}
                          onChange={(e) => {
                            setRegion(e.target.value);
                            setDistrict(""); // 시/도 변경 시 구/군 초기화
                          }}
                          disabled={user.role === "admin" && ADMIN_ONLY_TYPES.includes(selectedType)}
                          className={`w-full p-3 rounded-lg border ${
                            errors.location ? "border-red-500" : "border-gray-200"
                          } focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed`}
                        >
                          <option value="">시/도 선택</option>
                          {KOREA_REGIONS.map(({ region: regionName }) => (
                            <option key={regionName} value={regionName}>
                              {regionName}
                            </option>
                          ))}
                        </select>

                        <select
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          disabled={!region || (user.role === "admin" && ADMIN_ONLY_TYPES.includes(selectedType))}
                          className={`w-full p-3 rounded-lg border ${
                            errors.location ? "border-red-500" : "border-gray-200"
                          } focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed`}
                        >
                          <option value="">구/군 선택</option>
                          {region &&
                            KOREA_REGIONS.find((r) => r.region === region)?.districts.map(
                              (districtName) => (
                                <option key={districtName} value={districtName}>
                                  {districtName}
                                </option>
                              )
                            )}
                        </select>
                      </div>
                      {errors.location && (
                        <p className="mt-1 text-sm text-red-500">{errors.location}</p>
                      )}
                      {user.role === "admin" && ADMIN_ONLY_TYPES.includes(selectedType) && (
                        <p className="mt-1 text-xs text-gray-500">
                          * 매장 주인은 자동으로 매장 주소가 설정됩니다
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Gold Trade Additional Fields - buy_gold (admin only) */}
              {selectedCategory === "gold_trade" && selectedType === "buy_gold" && user.role === "admin" && (
                <div className="border-t pt-6">
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
                </div>
              )}

              {/* Content - 옵션 입력 후 마지막에 배치 */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    내용 <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateContent}
                    disabled={isGenerating || !title.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isGenerating ? "생성 중..." : "글 자동생성"}
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
                      className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                    >
                      <span>{showAdditionalNotes ? "▼" : "▶"}</span>
                      <span>추가로 강조하고 싶은 내용이 있나요? (선택)</span>
                    </button>
                    {showAdditionalNotes && (
                      <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <textarea
                          className="w-full p-2 text-sm rounded border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                          rows={2}
                          placeholder="예: 급하게 팔아야 해서 가격 협상 가능합니다 / 깨끗한 상태이고 박스 포함되어 있습니다"
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

              {/* 이미지 업로드 - 모든 카테고리에서 사용 가능 */}
              <div className="border-t pt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
