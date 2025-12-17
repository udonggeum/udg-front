"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  MapPin,
  Phone,
  Clock,
  ArrowLeft,
  Share2,
  Store as StoreIcon,
  Heart,
  Edit3,
  Star,
  Pencil,
  Settings,
  X,
  Check,
} from "lucide-react";
import { getStoreDetailAction, toggleStoreLikeAction } from "@/actions/stores";
import { getStoreProductsAction } from "@/actions/products";
import { getTagsAction } from "@/actions/tags";
import type { StoreDetail } from "@/types/stores";
import type { Product } from "@/types/products";
import type { Tag } from "@/types/tags";
import ProductCard from "@/components/product-card";
import TagEditModal from "@/components/tag-edit-modal";
import { useAuthStore } from "@/stores/useAuthStore";
import { getPresignedUrlAction, uploadToS3 } from "@/actions/upload";
import { toast } from "sonner";
import { useAuthenticatedAction } from "@/hooks/useAuthenticatedAction";

type TabType = "products" | "info";

function StoreDetailContent({ storeId }: { storeId: number | null }) {
  const router = useRouter();
  const isMountedRef = useRef(true);
  const { user, tokens } = useAuthStore();
  const accessToken = tokens?.access_token;
  const { checkAndHandleUnauthorized } = useAuthenticatedAction();

  const [store, setStore] = useState<StoreDetail | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingStore, setIsLoadingStore] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("products");
  const [imageError, setImageError] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editSections, setEditSections] = useState({
    name: false,
    description: false,
    address: false,
    phone: false,
    hours: false,
  });
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    open_time: "",
    close_time: "",
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);

  // store가 변경되면 imageError 초기화 및 formData 설정
  useEffect(() => {
    if (store) {
      setImageError(false);
      setFormData({
        name: store.name || "",
        description: store.description || "",
        address: store.address || "",
        phone: store.phone || "",
        open_time: store.open_time || "",
        close_time: store.close_time || "",
      });
    }
  }, [store]);

  // 컴포넌트 마운트 상태 추적
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 매장 정보 로드
  useEffect(() => {
    if (!storeId || storeId <= 0) {
      setStoreError("잘못된 매장 ID입니다.");
      setIsLoadingStore(false);
      return;
    }

    const loadStore = async () => {
      setIsLoadingStore(true);
      setStoreError(null);

      try {
        const result = await getStoreDetailAction(storeId, false, accessToken);

        if (result.success && result.data) {
          setStore(result.data.store);
          // 좋아요 상태 동기화
          if (result.data.is_liked !== undefined) {
            setIsWishlisted(result.data.is_liked);
          }
        } else {
          setStoreError(result.error || "매장 정보를 불러올 수 없습니다.");
        }
      } catch (err) {
        setStoreError("매장 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setIsLoadingStore(false);
      }
    };

    loadStore();
  }, [storeId, accessToken]);

  // 상품 목록 로드
  useEffect(() => {
    if (!store) return;

    const loadProducts = async () => {
      setIsLoadingProducts(true);
      setProductsError(null);

      try {
        const result = await getStoreProductsAction(store.id, {
          page: 1,
          page_size: 50,
        });

        if (result.success && result.data) {
          setProducts(result.data.products);
        } else {
          // 404 에러는 상품이 없는 것으로 처리 (에러 메시지 표시하지 않음)
          console.log("상품 조회 실패:", result.error);
          setProducts([]);
        }
      } catch (err) {
        console.error("상품 조회 에러:", err);
        setProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    loadProducts();
  }, [store]);

  // 로딩 상태
  if (isLoadingStore) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-[14px] text-gray-500">매장 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (storeError || !store) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <StoreIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-[20px] font-bold text-gray-900 mb-2">
            매장을 불러올 수 없습니다
          </h2>
          <p className="text-[14px] text-gray-500 mb-6">{storeError}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white text-[14px] font-semibold rounded-lg transition-colors"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 영업 상태 계산
  const getStoreStatus = () => {
    if (!store.open_time || !store.close_time) {
      return { label: "시간 정보 없음", className: "bg-gray-100 text-gray-600" };
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [openHour, openMin] = store.open_time.split(':').map(Number);
    const [closeHour, closeMin] = store.close_time.split(':').map(Number);

    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;

    if (currentTime >= openTime && currentTime < closeTime) {
      return { label: "영업중", className: "bg-green-100 text-green-700" };
    }
    return { label: "영업종료", className: "bg-red-100 text-red-700" };
  };

  const status = getStoreStatus();

  // 자기 매장인지 확인 (user_id가 있고, store의 user_id와 일치하는 경우)
  const isMyStore = user?.id && store.user_id && user.id === store.user_id;
  const isAnyEditing = Object.values(editSections).some(Boolean);

  // 찜하기 토글 핸들러
  const handleWishlistToggle = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      router.push("/login");
      return;
    }

    if (!accessToken) {
      toast.error("로그인이 필요합니다");
      router.push("/login");
      return;
    }

    try {
      const result = await toggleStoreLikeAction(Number(storeId), accessToken);

      if (result.success && result.data) {
        setIsWishlisted(result.data.is_liked);
        toast.success(result.data.is_liked ? "찜 목록에 추가되었습니다" : "찜 목록에서 제거되었습니다");
      } else {
        // 401 Unauthorized 체크 및 자동 로그아웃
        if (checkAndHandleUnauthorized(result)) {
          toast.error(result.error || "로그인이 만료되었습니다");
          return;
        }

        toast.error(result.error || "좋아요 처리에 실패했습니다");
      }
    } catch (error) {
      console.error("Toggle store like error:", error);
      toast.error("좋아요 처리 중 오류가 발생했습니다");
    }
  };

  // 전체 편집 모드 토글
  const handleToggleEditMode = () => {
    if (isEditMode || isAnyEditing) {
      // 편집 취소 - 원래 값으로 복원
      setFormData({
        name: store.name || "",
        description: store.description || "",
        address: store.address || "",
        phone: store.phone || "",
        open_time: store.open_time || "",
        close_time: store.close_time || "",
      });
      setEditSections({
        name: false,
        description: false,
        address: false,
        phone: false,
        hours: false,
      });
      setIsEditMode(false);
    } else {
      // 전체 편집 모드 활성화
      setIsEditMode(true);
      setEditSections({
        name: true,
        description: true,
        address: true,
        phone: true,
        hours: true,
      });
    }
  };

  // 개별 섹션 편집 시작
  const handleStartSectionEdit = (section: keyof typeof editSections) => {
    setEditSections((prev) => ({ ...prev, [section]: true }));
  };

  // 개별 섹션 편집 취소
  const handleCancelSectionEdit = (section: keyof typeof editSections) => {
    setEditSections((prev) => ({ ...prev, [section]: false }));
    // 원래 값으로 복원
    if (section === "name") setFormData((prev) => ({ ...prev, name: store.name || "" }));
    if (section === "description") setFormData((prev) => ({ ...prev, description: store.description || "" }));
    if (section === "address") setFormData((prev) => ({ ...prev, address: store.address || "" }));
    if (section === "phone") setFormData((prev) => ({ ...prev, phone: store.phone || "" }));
    if (section === "hours")
      setFormData((prev) => ({
        ...prev,
        open_time: store.open_time || "",
        close_time: store.close_time || "",
      }));
  };

  // 매장 이미지 업로드 핸들러
  const handleImageClick = () => {
    if (isMyStore && !isUploadingImage) {
      fileInputRef.current?.click();
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setIsUploadingImage(true);
    const loadingToast = toast.loading("이미지 업로드 중...");

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

      // 3. 매장 정보 업데이트
      await updateStoreData({ image_url: file_url });

      toast.success("이미지가 변경되었습니다.", { id: loadingToast });
      setImageError(false);
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error(error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.", {
        id: loadingToast,
      });
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 태그 목록 로드
  const loadTags = async () => {
    if (allTags.length > 0) return; // 이미 로드했으면 스킵

    setIsLoadingTags(true);
    try {
      const result = await getTagsAction();
      if (result.success && result.data) {
        setAllTags(result.data.tags);
      } else {
        toast.error(result.error || "태그 목록을 불러오지 못했습니다.");
      }
    } catch (error) {
      console.error("Load tags error:", error);
      toast.error("태그 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoadingTags(false);
    }
  };

  // 태그 편집 모달 열기
  const handleOpenTagModal = async () => {
    await loadTags();
    setIsTagModalOpen(true);
  };

  // 태그 저장
  const handleSaveTags = async (tagIds: number[]) => {
    const { tokens } = useAuthStore.getState();
    if (!tokens?.access_token || !store) return;

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://43.200.249.22:8080';

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/stores/${store.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokens.access_token}`,
        },
        body: JSON.stringify({
          name: store.name,
          region: store.region || "",
          district: store.district || "",
          address: store.address,
          phone_number: store.phone || store.phone_number,
          image_url: store.image_url,
          description: store.description,
          open_time: store.open_time,
          close_time: store.close_time,
          tag_ids: tagIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "태그 저장 실패");
      }

      const result = await response.json();
      setStore(result.store);
      toast.success("태그가 저장되었습니다.");
    } catch (error) {
      console.error("Save tags error:", error);
      toast.error(error instanceof Error ? error.message : "태그 저장에 실패했습니다.");
      throw error;
    }
  };

  // 매장 정보 업데이트 API 호출
  const updateStoreData = async (data: Partial<StoreDetail>) => {
    const { tokens } = useAuthStore.getState();
    if (!tokens?.access_token || !store) return;

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://43.200.249.22:8080';

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/stores/${store.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokens.access_token}`,
        },
        body: JSON.stringify({
          name: data.name || store.name,
          region: store.region || "",
          district: store.district || "",
          address: data.address !== undefined ? data.address : store.address,
          phone_number: data.phone !== undefined ? data.phone : store.phone,
          image_url: data.image_url !== undefined ? data.image_url : store.image_url,
          description: data.description !== undefined ? data.description : store.description,
          open_time: data.open_time !== undefined ? data.open_time : store.open_time,
          close_time: data.close_time !== undefined ? data.close_time : store.close_time,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "매장 정보 수정 실패");
      }

      const result = await response.json();
      setStore(result.store);
      return result.store;
    } catch (error) {
      console.error("Update store error:", error);
      throw error;
    }
  };

  // 개별 섹션 저장
  const handleSaveSection = async (section: keyof typeof editSections) => {
    let dataToSave: Partial<StoreDetail> = {};

    if (section === "name") dataToSave = { name: formData.name };
    else if (section === "description") dataToSave = { description: formData.description };
    else if (section === "address") dataToSave = { address: formData.address };
    else if (section === "phone") dataToSave = { phone: formData.phone };
    else if (section === "hours")
      dataToSave = { open_time: formData.open_time, close_time: formData.close_time };

    try {
      const loadingToast = toast.loading("저장 중...");
      await updateStoreData(dataToSave);
      setEditSections((prev) => ({ ...prev, [section]: false }));
      toast.success("저장되었습니다.", { id: loadingToast });
    } catch (error) {
      console.error("Save failed:", error);
      toast.error(error instanceof Error ? error.message : "저장에 실패했습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 커버 이미지 */}
      <div className="relative h-[280px] w-full overflow-hidden bg-gradient-to-br from-gray-50 via-gray-100 to-yellow-100">
        <div className="absolute inset-0 opacity-20">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="5" cy="5" r="1" fill="#2e2b29ff" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>

        {/* 뒤로가기 버튼 */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-10 flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-lg transition-colors shadow-sm"
        >
          <ArrowLeft className="w-5 h-5 text-gray-900" />
          <span className="text-[14px] font-semibold text-gray-900">뒤로가기</span>
        </button>
      </div>

      {/* 매장 메인 정보 */}
      <div className="relative z-10 -mt-20 max-w-[1080px] mx-auto px-5 w-full">
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-5">
          <div className="flex flex-col md:flex-row gap-4">
            {/* 매장 이미지 */}
            <div
              className={`w-32 h-32 bg-gray-100 border border-gray-200 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden relative ${
                isMyStore ? "group cursor-pointer" : ""
              }`}
              onClick={handleImageClick}
            >
              {/* 기본 아이콘 (항상 렌더링) */}
              <StoreIcon
                className={`w-16 h-16 text-gray-300 absolute inset-0 m-auto ${
                  !imageError &&
                  store.image_url &&
                  (store.image_url.startsWith("http://") || store.image_url.startsWith("https://"))
                    ? "opacity-0"
                    : "opacity-100"
                } transition-opacity`}
              />

              {/* 이미지 (유효한 URL인 경우에만 렌더링, 에러 시 숨김) */}
              {store.image_url &&
                (store.image_url.startsWith("http://") || store.image_url.startsWith("https://")) && (
                  <img
                    key={`${store.id}-${store.image_url}`}
                    src={store.image_url}
                    alt={store.name}
                    onError={(e) => {
                      e.currentTarget.style.opacity = "0";
                      if (isMountedRef.current) {
                        setImageError(true);
                      }
                    }}
                    onLoad={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                    className="w-full h-full object-cover transition-opacity"
                    style={{ opacity: 0 }}
                  />
                )}

              {/* 업로드 오버레이 (자기 매장일 때) */}
              {isMyStore && (
                <div
                  className={`absolute inset-0 flex items-center justify-center transition-all ${
                    isUploadingImage
                      ? "bg-black/40 opacity-100"
                      : "bg-black/50 opacity-0 group-hover:opacity-100"
                  }`}
                >
                  {isUploadingImage ? (
                    <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Pencil className="w-6 h-6 text-white drop-shadow-lg" />
                  )}
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
                disabled={isUploadingImage}
              />
            </div>

            {/* 매장 정보 */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  {/* 매장명 */}
                  <div
                    className={`inline-flex items-center gap-2 mb-2 ${
                      isMyStore && editSections.name
                        ? "bg-yellow-50 border-2 border-yellow-200 px-3 py-2 rounded-lg"
                        : isMyStore
                        ? "group px-3 py-2 rounded-lg hover:bg-gray-50"
                        : "px-3 py-2"
                    }`}
                  >
                    {isMyStore && editSections.name ? (
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="text-[28px] font-bold text-gray-900 bg-transparent border-none outline-none w-full min-w-[200px]"
                        placeholder="매장 이름"
                      />
                    ) : (
                      <h1 className="text-[28px] font-bold text-gray-900">{store.name}</h1>
                    )}
                    {/* 매장명 수정 중이 아닐 때만 영업 상태 표시 */}
                    {!editSections.name && (
                      <span className={`px-3 py-1 text-[13px] font-semibold rounded-full ${status.className}`}>
                        {status.label}
                      </span>
                    )}
                    {isMyStore && !editSections.name && (
                      <button
                        onClick={() => handleStartSectionEdit("name")}
                        className="transition-opacity p-1.5 hover:bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100"
                      >
                        <Pencil className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                  </div>
                  {/* 저장/취소 버튼 (매장명) */}
                  {isMyStore && editSections.name && (
                    <div className="flex gap-2 mb-2 ml-3">
                      <button
                        onClick={() => handleCancelSectionEdit("name")}
                        className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-900 text-[12px] font-semibold rounded-lg border border-gray-200 transition-colors"
                      >
                        취소
                      </button>
                      <button
                        onClick={() => handleSaveSection("name")}
                        className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-[12px] font-semibold rounded-lg transition-colors"
                      >
                        저장
                      </button>
                    </div>
                  )}

                  {/* 별점 + 리뷰 수 */}
                  <div className="flex items-center gap-3 text-[15px] mb-3 ml-3">
                    <span className="flex items-center gap-1 text-yellow-500 font-semibold">
                      <Star className="w-5 h-5 fill-current" />
                      4.8
                    </span>
                    <span className="text-gray-300">|</span>
                    <a href="#reviews" className="text-gray-600 hover:text-gray-900 transition-colors">
                      리뷰 128개
                    </a>
                  </div>

                  {/* 매장 한줄 소개 */}
                  {(store.description || isMyStore) && (
                    <div
                      className={`mb-3 p-3 rounded-lg transition-all ${
                        isMyStore && editSections.description
                          ? "bg-yellow-50 border-2 border-yellow-200"
                          : isMyStore
                          ? "group hover:bg-gray-50"
                          : ""
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="flex-1">
                          {isMyStore && editSections.description ? (
                            <textarea
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              className="w-full text-[15px] leading-relaxed text-gray-600 bg-transparent border-none outline-none resize-none"
                              placeholder="한줄로 매장을 소개해주세요"
                              rows={2}
                            />
                          ) : (
                            <p
                              className={`text-[15px] leading-relaxed ${
                                store.description ? "text-gray-600" : "text-gray-400 italic"
                              }`}
                            >
                              {store.description || "한줄 소개를 입력해주세요"}
                            </p>
                          )}
                        </div>
                        {isMyStore && !editSections.description && (
                          <button
                            onClick={() => handleStartSectionEdit("description")}
                            className="transition-opacity p-1.5 hover:bg-gray-100 rounded-lg flex-shrink-0 opacity-0 group-hover:opacity-100"
                          >
                            <Pencil className="w-4 h-4 text-gray-600" />
                          </button>
                        )}
                      </div>
                      {isMyStore && editSections.description && (
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={() => handleCancelSectionEdit("description")}
                            className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-900 text-[12px] font-semibold rounded-lg border border-gray-200 transition-colors"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => handleSaveSection("description")}
                            className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-[12px] font-semibold rounded-lg transition-colors"
                          >
                            저장
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 우측 상단 버튼 */}
                <div className="flex items-center gap-2 ml-4">
                  {isMyStore ? (
                    <button
                      onClick={handleToggleEditMode}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors text-[13px] font-semibold ${
                        isAnyEditing || isEditMode
                          ? "bg-gray-900 hover:bg-gray-800 text-white"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                      }`}
                    >
                      <Settings className="w-4 h-4" />
                      {isAnyEditing || isEditMode ? "편집 종료" : "편집"}
                    </button>
                  ) : (
                    <button
                      onClick={handleWishlistToggle}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Heart className={`w-5 h-5 ${isWishlisted ? "fill-red-500 text-red-500" : "text-gray-600"}`} />
                      <span className="text-[14px] font-semibold text-gray-900">찜하기</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 매장 태그 */}
              {(store.tags && store.tags.length > 0) || isMyStore ? (
                <div
                  className={`mb-4 ml-3 p-3 rounded-lg transition-all ${
                    isMyStore ? "group hover:bg-gray-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap gap-2 flex-1">
                      {store.tags && store.tags.length > 0 ? (
                        store.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 text-[13px] font-medium rounded-lg"
                          >
                            {tag.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-[13px] italic">태그를 추가해주세요</span>
                      )}
                    </div>
                    {isMyStore && (
                      <button
                        onClick={handleOpenTagModal}
                        className="transition-opacity p-1.5 hover:bg-gray-100 rounded-lg flex-shrink-0 opacity-0 group-hover:opacity-100"
                      >
                        <Pencil className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                  </div>
                </div>
              ) : null}

              {/* 빠른 액션 버튼 */}
              <div className="flex gap-3">
                {store.phone && (
                  <a
                    href={`tel:${store.phone.replace(/[^0-9]/g, '')}`}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-900 hover:bg-gray-800 text-white text-[15px] font-semibold rounded-xl transition-colors"
                  >
                    <Phone className="w-5 h-5" />
                    문의하기
                  </a>
                )}
                {store.address && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border-2 border-gray-200 hover:border-gray-900 text-gray-900 text-[15px] font-semibold rounded-xl transition-colors"
                  >
                    <MapPin className="w-5 h-5" />
                    길찾기
                  </a>
                )}
                <button className="flex items-center justify-center gap-2 px-5 py-3 bg-white border-2 border-gray-200 hover:border-gray-900 text-gray-900 text-[15px] font-semibold rounded-xl transition-colors">
                  <Share2 className="w-5 h-5" />
                  공유
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-[1080px] mx-auto px-5 py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 좌측: 메인 컨텐츠 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* 탭 네비게이션 */}
              <nav className="border-b border-gray-100 px-6 flex items-center gap-8 overflow-x-auto">
                <button
                  onClick={() => setActiveTab("products")}
                  className={`relative py-4 text-[15px] font-medium whitespace-nowrap transition-colors ${
                    activeTab === "products"
                      ? "text-gray-900 font-semibold after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:bg-gray-900"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  상품 목록 {products.length > 0 && `(${products.length})`}
                </button>
                <button
                  onClick={() => setActiveTab("info")}
                  className={`relative py-4 text-[15px] font-medium whitespace-nowrap transition-colors ${
                    activeTab === "info"
                      ? "text-gray-900 font-semibold after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:bg-gray-900"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  매장 정보
                </button>
              </nav>

              {/* 탭 콘텐츠 */}
              <div className="p-6">
                {activeTab === "products" && (
                  <div>
                    {isLoadingProducts ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                      </div>
                    ) : productsError ? (
                      <div className="p-12 text-center">
                        <p className="text-gray-500 mb-2">상품을 불러올 수 없습니다</p>
                        <p className="text-[13px] text-gray-400">{productsError}</p>
                      </div>
                    ) : products.length === 0 ? (
                      <div className="p-12 text-center">
                        <StoreIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-2">등록된 상품이 없습니다</p>
                        <p className="text-[13px] text-gray-400">
                          매장에서 상품을 등록하면 이곳에 표시됩니다
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {products.map((product) => (
                          <ProductCard key={product.id} product={product} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "info" && (
                  <div className="space-y-4">
                    <div className="prose prose-sm max-w-none">
                      {store.description ? (
                        <p className="text-[15px] text-gray-700 leading-relaxed">
                          {store.description}
                        </p>
                      ) : (
                        <p className="text-[15px] text-gray-400 italic">
                          매장 소개가 등록되지 않았습니다
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 우측: 사이드바 */}
          <div className="lg:col-span-1">
            <div className="sticky top-[180px] space-y-4">
              {/* 매장 정보 카드 */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="text-[16px] font-bold text-gray-900 mb-3">매장 정보</h3>
                <div className="space-y-3 text-[14px]">
                  {/* 주소 */}
                  {(store.address || isMyStore) && (
                    <div
                      className={`p-3 rounded-lg transition-all ${
                        isMyStore && editSections.address
                          ? "bg-yellow-50 border-2 border-yellow-200"
                          : isMyStore
                          ? "group bg-gray-50 hover:bg-gray-100 border border-gray-100"
                          : "bg-gray-50 border border-gray-100"
                      }`}
                    >
                      <div className="flex gap-3">
                        <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          {isMyStore && editSections.address ? (
                            <input
                              type="text"
                              value={formData.address}
                              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                              className="w-full text-[14px] text-gray-600 bg-transparent border-none outline-none"
                              placeholder="매장 주소"
                            />
                          ) : (
                            <div className={store.address ? "text-gray-600" : "text-gray-400 italic"}>
                              {store.address || "주소를 입력해주세요"}
                            </div>
                          )}
                        </div>
                        {isMyStore && !editSections.address && (
                          <button
                            onClick={() => handleStartSectionEdit("address")}
                            className="transition-opacity p-1 hover:bg-gray-200 rounded flex-shrink-0 opacity-0 group-hover:opacity-100"
                          >
                            <Pencil className="w-3.5 h-3.5 text-gray-600" />
                          </button>
                        )}
                      </div>
                      {isMyStore && editSections.address && (
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={() => handleCancelSectionEdit("address")}
                            className="px-3 py-1 bg-white hover:bg-gray-100 text-gray-900 text-[11px] font-semibold rounded border border-gray-200 transition-colors"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => handleSaveSection("address")}
                            className="px-3 py-1 bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-[11px] font-semibold rounded transition-colors"
                          >
                            저장
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 전화번호 */}
                  {(store.phone || isMyStore) && (
                    <div
                      className={`p-3 rounded-lg transition-all ${
                        isMyStore && editSections.phone
                          ? "bg-yellow-50 border-2 border-yellow-200"
                          : isMyStore
                          ? "group bg-gray-50 hover:bg-gray-100 border border-gray-100"
                          : "bg-gray-50 border border-gray-100"
                      }`}
                    >
                      <div className="flex gap-3">
                        <Phone className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          {isMyStore && editSections.phone ? (
                            <input
                              type="tel"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              className="w-full text-[14px] text-gray-600 bg-transparent border-none outline-none"
                              placeholder="전화번호"
                            />
                          ) : store.phone ? (
                            <a href={`tel:${store.phone}`} className="text-blue-600 hover:underline">
                              {store.phone}
                            </a>
                          ) : (
                            <div className="text-gray-400 italic">전화번호를 입력해주세요</div>
                          )}
                        </div>
                        {isMyStore && !editSections.phone && (
                          <button
                            onClick={() => handleStartSectionEdit("phone")}
                            className="transition-opacity p-1 hover:bg-gray-200 rounded flex-shrink-0 opacity-0 group-hover:opacity-100"
                          >
                            <Pencil className="w-3.5 h-3.5 text-gray-600" />
                          </button>
                        )}
                      </div>
                      {isMyStore && editSections.phone && (
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={() => handleCancelSectionEdit("phone")}
                            className="px-3 py-1 bg-white hover:bg-gray-100 text-gray-900 text-[11px] font-semibold rounded border border-gray-200 transition-colors"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => handleSaveSection("phone")}
                            className="px-3 py-1 bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-[11px] font-semibold rounded transition-colors"
                          >
                            저장
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 영업시간 */}
                  {(store.open_time || store.close_time || isMyStore) && (
                    <div
                      className={`p-3 rounded-lg transition-all ${
                        isMyStore && editSections.hours
                          ? "bg-yellow-50 border-2 border-yellow-200"
                          : isMyStore
                          ? "group bg-gray-50 hover:bg-gray-100 border border-gray-100"
                          : "bg-gray-50 border border-gray-100"
                      }`}
                    >
                      <div className="flex gap-3">
                        <Clock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          {isMyStore && editSections.hours ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="time"
                                value={formData.open_time}
                                onChange={(e) => setFormData({ ...formData, open_time: e.target.value })}
                                className="text-[14px] text-gray-900 bg-transparent border border-gray-300 rounded px-2 py-1 outline-none focus:border-yellow-400"
                              />
                              <span className="text-gray-500">-</span>
                              <input
                                type="time"
                                value={formData.close_time}
                                onChange={(e) => setFormData({ ...formData, close_time: e.target.value })}
                                className="text-[14px] text-gray-900 bg-transparent border border-gray-300 rounded px-2 py-1 outline-none focus:border-yellow-400"
                              />
                            </div>
                          ) : (
                            <div className="text-[14px] text-gray-900 font-medium">
                              {(store.open_time || "--:--") + " - " + (store.close_time || "--:--")}
                            </div>
                          )}
                        </div>
                        {isMyStore && !editSections.hours && (
                          <button
                            onClick={() => handleStartSectionEdit("hours")}
                            className="transition-opacity p-1 hover:bg-gray-200 rounded flex-shrink-0 opacity-0 group-hover:opacity-100"
                          >
                            <Pencil className="w-3.5 h-3.5 text-gray-600" />
                          </button>
                        )}
                      </div>
                      {isMyStore && editSections.hours && (
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={() => handleCancelSectionEdit("hours")}
                            className="px-3 py-1 bg-white hover:bg-gray-100 text-gray-900 text-[11px] font-semibold rounded border border-gray-200 transition-colors"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => handleSaveSection("hours")}
                            className="px-3 py-1 bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-[11px] font-semibold rounded transition-colors"
                          >
                            저장
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 지도 미리보기 */}
              {store.address && (
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                  <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13px] text-blue-600 hover:underline"
                      >
                        지도 보기
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tag Edit Modal */}
      {isMyStore && (
        <TagEditModal
          isOpen={isTagModalOpen}
          onClose={() => setIsTagModalOpen(false)}
          allTags={allTags}
          selectedTagIds={store?.tags?.map((tag) => tag.id) || []}
          onSave={handleSaveTags}
        />
      )}
    </div>
  );
}

export default function StoreDetailPage() {
  const params = useParams();
  const storeId = params.storeId ? Number(params.storeId) : null;

  // storeId가 변경되면 컴포넌트를 완전히 재마운트
  return <StoreDetailContent key={storeId} storeId={storeId} />;
}
