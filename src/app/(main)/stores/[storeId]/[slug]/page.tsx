"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  MapPin,
  Phone,
  Clock,
  Share2,
  Store as StoreIcon,
  Heart,
  Edit3,
  Pencil,
  Settings,
  X,
  Check,
  MessageCircle,
  Pin,
  Image as ImageIcon,
  Calendar,
  Eye,
  ThumbsUp,
  MessageSquare,
  PenSquare,
  Newspaper,
  Copy,
  Sparkles,
} from "lucide-react";
import { getStoreDetailAction, toggleStoreLikeAction } from "@/actions/stores";
import { getTagsAction } from "@/actions/tags";
import { createChatRoomAction } from "@/actions/chat";
import { getPostsAction, getStoreGalleryAction, pinPostAction, unpinPostAction } from "@/actions/community";
import type { CommunityPost, GalleryItem, PostType } from "@/types/community";
import type { StoreDetail } from "@/types/stores";
import type { Tag } from "@/types/tags";
import TagEditModal from "@/components/tag-edit-modal";
import { useAuthStore } from "@/stores/useAuthStore";
import { getPresignedUrlAction, uploadToS3 } from "@/actions/upload";
import { toast } from "sonner";
import { useAuthenticatedAction } from "@/hooks/useAuthenticatedAction";
import { apiClient } from "@/lib/axios";

type TabType = "home" | "news" | "gallery";

// 카카오 지도 컴포넌트
function KakaoMap({ address, storeName }: { address: string; storeName: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current || !window.kakao || !window.kakao.maps) return;

      const geocoder = new window.kakao.maps.services.Geocoder();

      // 주소로 좌표 검색
      geocoder.addressSearch(address, (result: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);

          // 지도 생성
          const map = new window.kakao.maps.Map(mapRef.current, {
            center: coords,
            level: 3,
          });

          // 마커 생성
          const marker = new window.kakao.maps.Marker({
            map: map,
            position: coords,
          });

          // 인포윈도우 생성
          const infowindow = new window.kakao.maps.InfoWindow({
            content: `<div style="padding:8px 12px;font-size:13px;font-weight:600;color:#1f2937;">${storeName}</div>`,
          });

          infowindow.open(map, marker);
          setIsLoading(false);
        } else {
          setError(true);
          setIsLoading(false);
        }
      });
    };

    const loadKakaoMap = () => {
      try {
        // 카카오맵 스크립트가 이미 로드되었는지 확인
        if (window.kakao && window.kakao.maps) {
          initMap();
          return;
        }

        // 카카오맵 스크립트 동적 로드
        const script = document.createElement('script');
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&libraries=services&autoload=false`;
        script.async = true;
        script.onload = () => {
          window.kakao.maps.load(() => {
            initMap();
          });
        };
        script.onerror = () => {
          setError(true);
          setIsLoading(false);
        };
        document.head.appendChild(script);
      } catch (err) {
        setError(true);
        setIsLoading(false);
      }
    };

    loadKakaoMap();
  }, [address, storeName]);

  if (error) {
    return (
      <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <a
            href={`https://map.kakao.com/link/search/${encodeURIComponent(address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-small text-blue-600 hover:underline"
          >
            지도에서 보기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-square">
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
      <a
        href={`https://map.kakao.com/link/map/${encodeURIComponent(storeName)},${address.split(' ')[0]}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-3 px-3 py-1.5 bg-white shadow-md rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        크게 보기
      </a>
    </div>
  );
}

function StoreDetailContent({ storeId }: { storeId: number | null }) {
  const router = useRouter();
  const isMountedRef = useRef(true);
  const { user, tokens } = useAuthStore();
  const accessToken = tokens?.access_token;
  const { checkAndHandleUnauthorized } = useAuthenticatedAction();

  const [store, setStore] = useState<StoreDetail | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [isLoadingStore, setIsLoadingStore] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [selectedNewsType, setSelectedNewsType] = useState<PostType | "all">("all");
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
    phone_number: "",
    open_time: "",
    close_time: "",
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);

  // 자기 매장인지 확인 (user_id가 있고, store의 user_id와 일치하는 경우)
  const isMyStore = user?.id && store?.user_id && user.id === store.user_id;
  const isAnyEditing = Object.values(editSections).some(Boolean);

  // store가 변경되면 imageError 초기화 및 formData 설정
  useEffect(() => {
    if (store) {
      setImageError(false);
      setFormData({
        name: store.name || "",
        description: store.description || "",
        address: store.address || "",
        phone_number: store.phone_number || "",
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

  // 상품 목록 로드 - 상품 기능 제거로 주석 처리
  // useEffect(() => {
  //   if (!store) return;

  //   const loadProducts = async () => {
  //     setIsLoadingProducts(true);
  //     setProductsError(null);

  //     try {
  //       const result = await getStoreProductsAction(store.id, {
  //         page: 1,
  //         page_size: 50,
  //       });

  //       if (result.success && result.data) {
  //         setProducts(result.data.products);
  //       } else {
  //         // 404 에러는 상품이 없는 것으로 처리 (에러 메시지 표시하지 않음)
  //         console.log("상품 조회 실패:", result.error);
  //         setProducts([]);
  //       }
  //     } catch (err) {
  //       console.error("상품 조회 에러:", err);
  //       setProducts([]);
  //     } finally {
  //       setIsLoadingProducts(false);
  //     }
  //   };

  //   loadProducts();
  // }, [store]);

  // 게시글 목록 로드 (홈 탭과 매장소식 탭에서 사용)
  useEffect(() => {
    if (!store || (activeTab !== "home" && activeTab !== "news")) return;

    const loadPosts = async () => {
      setIsLoadingPosts(true);

      try {
        const result = await getPostsAction({
          store_id: store.id,
          page: 1,
          page_size: 20,
          sort_by: "created_at",
          sort_order: "desc",
        });

        if (result.success && result.data) {
          setPosts(result.data.data);
        } else {
          setPosts([]);
        }
      } catch (err) {
        console.error("게시글 조회 에러:", err);
        setPosts([]);
      } finally {
        setIsLoadingPosts(false);
      }
    };

    loadPosts();
  }, [store?.id, activeTab]); // ✅ store 대신 store?.id 사용

  // 갤러리 로드
  useEffect(() => {
    if (!store || activeTab !== "gallery") return;

    const loadGallery = async () => {
      setIsLoadingGallery(true);

      try {
        const result = await getStoreGalleryAction(store.id, 1, 20);

        if (result.success && result.data) {
          setGallery(result.data.data);
        } else {
          setGallery([]);
        }
      } catch (err) {
        console.error("갤러리 조회 에러:", err);
        setGallery([]);
      } finally {
        setIsLoadingGallery(false);
      }
    };

    loadGallery();
  }, [store?.id, activeTab]); // ✅ store 대신 store?.id 사용

  // 로딩 상태
  if (isLoadingStore) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-caption text-gray-500">매장 정보를 불러오는 중...</p>
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
          <p className="text-caption text-gray-500 mb-6">{storeError}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white text-caption font-semibold rounded-lg transition-colors"
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
      return { label: "영업중", className: "bg-[#FEF9E7] text-[#8A6A00]" };
    }
    return { label: "영업종료", className: "bg-gray-100 text-gray-600" };
  };

  const status = getStoreStatus();

  // 24시간 이내 작성된 글인지 확인
  const isNewPost = (createdAt: string) => {
    const postDate = new Date(createdAt);
    const now = new Date();
    const diffInHours = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60);
    return diffInHours <= 24;
  };

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
        phone_number: store.phone_number || "",
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
    if (section === "phone") setFormData((prev) => ({ ...prev, phone_number: store.phone_number || "" }));
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
  // 문의하기 핸들러
  const handleInquiry = async () => {
    const { user, tokens } = useAuthStore.getState();

    if (!user || !tokens?.access_token) {
      toast.error("로그인이 필요합니다.");
      router.push("/login");
      return;
    }

    if (!store || !store.user_id) {
      toast.error("매장 정보를 불러올 수 없습니다.");
      return;
    }

    // 자기 매장에는 문의 불가
    if (user.id === store.user_id) {
      toast.error("자신의 매장에는 문의할 수 없습니다.");
      return;
    }

    const loadingToast = toast.loading("대화방을 생성하는 중...");

    try {
      const result = await createChatRoomAction(
        {
          target_user_id: store.user_id,
          type: "STORE",
          store_id: store.id,
        },
        tokens.access_token
      );

      if (result.success && result.data) {
        toast.success(
          result.data.is_new ? "새 대화방이 생성되었습니다." : "대화방으로 이동합니다.",
          { id: loadingToast }
        );
        router.push(`/chats/${result.data.room.id}`);
      } else {
        toast.error(result.error || "대화방 생성에 실패했습니다.", { id: loadingToast });
      }
    } catch (error) {
      console.error("Create chat room error:", error);
      toast.error("대화방 생성 중 오류가 발생했습니다.", { id: loadingToast });
    }
  };

  // 전화번호 복사 핸들러
  const handleCopyPhoneNumber = async () => {
    if (!store.phone_number) return;

    try {
      await navigator.clipboard.writeText(store.phone_number);
      toast.success(`${store.phone_number}가 복사되었습니다.`);
    } catch (error) {
      console.error("Copy phone number error:", error);
      toast.error("전화번호 복사에 실패했습니다.");
    }
  };

  const handleSaveTags = async (tagIds: number[]) => {
    const { tokens } = useAuthStore.getState();
    if (!tokens?.access_token || !store) return;

    try {
      const response = await apiClient.put(
        `/stores/${store.id}`,
        {
          name: store.name,
          region: store.region || "",
          district: store.district || "",
          address: store.address,
          phone_number: store.phone_number,
          image_url: store.image_url,
          description: store.description,
          open_time: store.open_time,
          close_time: store.close_time,
          tag_ids: tagIds,
        },
        {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        }
      );

      setStore(response.data.store);
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

    try {
      const response = await apiClient.put(
        `/stores/${store.id}`,
        {
          name: data.name || store.name,
          region: store.region || "",
          district: store.district || "",
          address: data.address !== undefined ? data.address : store.address,
          phone_number: data.phone_number !== undefined ? data.phone_number : store.phone_number,
          image_url: data.image_url !== undefined ? data.image_url : store.image_url,
          description: data.description !== undefined ? data.description : store.description,
          open_time: data.open_time !== undefined ? data.open_time : store.open_time,
          close_time: data.close_time !== undefined ? data.close_time : store.close_time,
          tag_ids: store.tags?.map(tag => tag.id) || [], // 기존 태그 유지
        },
        {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        }
      );

      setStore(response.data.store);
      return response.data.store;
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
    else if (section === "phone") dataToSave = { phone_number: formData.phone_number };
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
      <div className="relative h-[280px] w-full overflow-hidden bg-gradient-to-br from-gray-50 via-gray-100 to-[#FEF9E7]">
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
      </div>

      {/* 매장 메인 정보 */}
      <div className="relative z-10 -mt-20 max-w-[1080px] mx-auto px-page w-full">
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-5">
          <div className="flex flex-col md:flex-row gap-4">
            {/* 매장 이미지 */}
            <div
              className={`w-32 h-32 ${
                store.image_url &&
                (store.image_url.startsWith("http://") || store.image_url.startsWith("https://")) &&
                !imageError
                  ? "bg-white"
                  : "bg-gray-100"
              } border border-gray-200 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden relative ${
                isMyStore ? "group cursor-pointer" : ""
              }`}
              onClick={handleImageClick}
            >
              {/* 기본 아이콘 (이미지가 없거나 에러일 때만 표시) */}
              {(!store.image_url ||
                imageError ||
                !(
                  store.image_url.startsWith("http://") || store.image_url.startsWith("https://")
                )) && (
                <StoreIcon className="w-16 h-16 text-gray-300" />
              )}

              {/* 이미지 (유효한 URL인 경우에만 렌더링) */}
              {store.image_url &&
                (store.image_url.startsWith("http://") || store.image_url.startsWith("https://")) &&
                !imageError && (
                  <img
                    key={`${store.id}-${store.image_url}`}
                    src={store.image_url}
                    alt={store.name}
                    onError={(e) => {
                      if (isMountedRef.current) {
                        setImageError(true);
                      }
                    }}
                    className="w-full h-full object-cover"
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
                        ? "bg-[#FEF9E7] border-2 border-[#C9A227]/30 px-3 py-2 rounded-lg"
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
                      <span className={`px-3 py-1 text-small font-semibold rounded-full ${status.className}`}>
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
                        className="px-3 py-1.5 bg-[#C9A227] hover:bg-[#8A6A00] text-white text-[12px] font-semibold rounded-lg transition-colors"
                      >
                        저장
                      </button>
                    </div>
                  )}

                  {/* 매장 한줄 소개 */}
                  {(store.description || isMyStore) && (
                    <div
                      className={`mb-3 p-3 rounded-lg transition-all ${
                        isMyStore && editSections.description
                          ? "bg-[#FEF9E7] border-2 border-[#C9A227]/30"
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
                              className="w-full text-body leading-relaxed text-gray-600 bg-transparent border-none outline-none resize-none"
                              placeholder="한줄로 매장을 소개해주세요"
                              rows={2}
                            />
                          ) : (
                            <p
                              className={`text-body leading-relaxed ${
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
                            className="px-3 py-1.5 bg-[#C9A227] hover:bg-[#8A6A00] text-white text-[12px] font-semibold rounded-lg transition-colors"
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
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors text-small font-semibold ${
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
                      <span className="text-caption font-semibold text-gray-900">찜하기</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 매장 태그 */}
              {(store.tags && store.tags.length > 0) || isMyStore ? (
                <div
                  className={`mb-4 ml-3 p-3 rounded-lg transition-all ${
                    isMyStore && (isEditMode || isAnyEditing)
                      ? "bg-[#FEF9E7] border-2 border-[#C9A227]/30"
                      : isMyStore
                      ? "group hover:bg-gray-50"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap gap-2 flex-1">
                      {store.tags && store.tags.length > 0 ? (
                        store.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 text-small font-medium rounded-lg"
                          >
                            {tag.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-small italic">태그를 추가해주세요</span>
                      )}
                    </div>
                    {isMyStore && (
                      <button
                        onClick={handleOpenTagModal}
                        className={`transition-opacity p-1.5 hover:bg-gray-100 rounded-lg flex-shrink-0 ${
                          isEditMode || isAnyEditing ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        <Pencil className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                  </div>
                </div>
              ) : null}

              {/* 빠른 액션 버튼 */}
              <div className="flex gap-3">
                {isMyStore ? (
                  <>
                    {/* 내 매장: 구매글 작성, 매장소식 작성 - Secondary */}
                    <button
                      onClick={() => router.push(`/community/write?category=gold_trade&store_id=${store.id}`)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 text-body font-semibold rounded-xl transition-all active:scale-[0.98]"
                    >
                      <PenSquare className="w-5 h-5" />
                      구매글 작성
                    </button>
                    <button
                      onClick={() => router.push(`/community/write?type=store_news&store_id=${store.id}`)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 text-body font-semibold rounded-xl transition-all active:scale-[0.98]"
                    >
                      <Newspaper className="w-5 h-5" />
                      매장소식 작성
                    </button>
                  </>
                ) : (
                  <>
                    {/* 다른 매장: 문의하기(Primary CTA), 전화번호 복사(Secondary) */}
                    <button
                      onClick={handleInquiry}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#C9A227] hover:bg-[#8A6A00] text-white text-body font-semibold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                    >
                      <MessageCircle className="w-5 h-5" />
                      문의하기
                    </button>
                    {store.phone_number && (
                      <button
                        onClick={handleCopyPhoneNumber}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 text-body font-semibold rounded-xl transition-all active:scale-[0.98]"
                      >
                        <Copy className="w-5 h-5" />
                        전화번호 복사
                      </button>
                    )}
                  </>
                )}

                {/* 공통: 길찾기, 공유 */}
                {store.address && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 hover:border-gray-900 text-gray-900 text-body font-semibold rounded-xl transition-colors"
                  >
                    <MapPin className="w-5 h-5" />
                    <span className="sr-only">길찾기</span>
                  </a>
                )}
                <button className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 hover:border-gray-900 text-gray-900 text-body font-semibold rounded-xl transition-colors">
                  <Share2 className="w-5 h-5" />
                  <span className="sr-only">공유</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-[1080px] mx-auto px-page py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 좌측: 메인 컨텐츠 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* 탭 네비게이션 */}
              <nav className="border-b border-gray-100 px-6 flex items-center gap-8 overflow-x-auto">
                <button
                  onClick={() => setActiveTab("home")}
                  className={`relative py-4 text-body font-medium whitespace-nowrap transition-colors ${
                    activeTab === "home"
                      ? "text-gray-900 font-semibold after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:bg-gray-900"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  홈
                </button>
                <button
                  onClick={() => setActiveTab("news")}
                  className={`relative py-4 text-body font-medium whitespace-nowrap transition-colors ${
                    activeTab === "news"
                      ? "text-gray-900 font-semibold after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:bg-gray-900"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  매장소식
                </button>
                <button
                  onClick={() => setActiveTab("gallery")}
                  className={`relative py-4 text-body font-medium whitespace-nowrap transition-colors ${
                    activeTab === "gallery"
                      ? "text-gray-900 font-semibold after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:bg-gray-900"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  갤러리
                </button>
              </nav>

              {/* 탭 콘텐츠 */}
              <div className="p-6">
                {activeTab === "home" && (
                  <div className="space-y-4">
                    {isLoadingPosts ? (
                      <div className="flex items-center justify-center py-page">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                      </div>
                    ) : (() => {
                      const pinnedPosts = posts.filter(post => post.is_pinned);
                      const newPosts = posts.filter(post => !post.is_pinned && isNewPost(post.created_at));
                      const hasContent = pinnedPosts.length > 0 || newPosts.length > 0;

                      return !hasContent ? (
                        <div className="text-center py-page">
                          <p className="text-gray-500">아직 작성된 게시글이 없습니다.</p>
                        </div>
                      ) : (
                        <>
                          {/* 고정된 게시글 */}
                          {pinnedPosts.map((post) => (
                          <div
                            key={post.id}
                            className="group border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer bg-[#FEF9E7] border-[#C9A227]/30"
                            onClick={() => router.push(`/community/posts/${post.id}`)}
                          >
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-2">
                                <Pin className="w-4 h-4 text-[#C9A227] fill-[#C9A227]" />
                                <span className="text-xs font-medium text-[#8A6A00]">고정됨</span>
                              </div>
                              {isMyStore && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!accessToken) return;
                                    const result = await unpinPostAction(post.id, accessToken);
                                    if (result.success) {
                                      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_pinned: false } : p));
                                    }
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 text-xs font-medium text-[#8A6A00] bg-white border border-[#C9A227] rounded-lg hover:bg-[#FEF9E7]"
                                >
                                  고정 해제
                                </button>
                              )}
                            </div>

                            <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
                              {post.title}
                            </h3>

                            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                              {post.content}
                            </p>

                            {post.image_urls && post.image_urls.length > 0 && (
                              <div className="mb-4 rounded-lg overflow-hidden">
                                <img
                                  src={post.image_urls[0]}
                                  alt={post.title}
                                  className="w-full h-48 object-cover"
                                />
                              </div>
                            )}

                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(post.created_at).toLocaleDateString('ko-KR')}
                              </div>
                              <div className="flex items-center gap-1">
                                <Eye className="w-4 h-4" />
                                {post.view_count}
                              </div>
                              <div className="flex items-center gap-1">
                                <ThumbsUp className="w-4 h-4" />
                                {post.like_count}
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageSquare className="w-4 h-4" />
                                {post.comment_count}
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* 24시간 이내 작성된 게시글 */}
                        {newPosts.map((post) => (
                          <div
                            key={post.id}
                            className="group border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => router.push(`/community/posts/${post.id}`)}
                          >
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1 px-2 py-1 text-xs font-bold bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-full shadow-sm">
                                  <Sparkles className="w-3 h-3" />
                                  NEW
                                </span>
                                {post.type === 'buy_gold' && (
                                  <span className="px-2 py-1 text-xs font-semibold bg-[#FEF3C7] text-[#8A6A00] rounded-md">
                                    금 구매
                                  </span>
                                )}
                                {post.type === 'sell_gold' && (
                                  <span className="px-2 py-1 text-xs font-semibold bg-[#FEF3C7] text-[#8A6A00] rounded-md">
                                    금 판매
                                  </span>
                                )}
                                {post.type === 'product_news' && (
                                  <span className="px-2 py-1 text-xs font-semibold bg-[#FEF3C7] text-[#8A6A00] rounded-md">
                                    상품소식
                                  </span>
                                )}
                                {post.type === 'store_news' && (
                                  <span className="px-2 py-1 text-xs font-semibold bg-[#FEF3C7] text-[#8A6A00] rounded-md">
                                    매장소식
                                  </span>
                                )}
                                {post.type === 'question' && (
                                  <span className="px-2 py-1 text-xs font-semibold bg-[#FEF3C7] text-[#8A6A00] rounded-md">
                                    질문
                                  </span>
                                )}
                              </div>
                              {isMyStore && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!accessToken) return;
                                    const result = await pinPostAction(post.id, accessToken);
                                    if (result.success) {
                                      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_pinned: true } : p));
                                    }
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 text-xs font-medium text-[#8A6A00] bg-white border border-[#C9A227] rounded-lg hover:bg-[#FEF9E7]"
                                >
                                  고정
                                </button>
                              )}
                            </div>

                            <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
                              {post.title}
                            </h3>

                            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                              {post.content}
                            </p>

                            {post.image_urls && post.image_urls.length > 0 && (
                              <div className="mb-4 rounded-lg overflow-hidden">
                                <img
                                  src={post.image_urls[0]}
                                  alt={post.title}
                                  className="w-full h-48 object-cover"
                                />
                              </div>
                            )}

                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(post.created_at).toLocaleDateString('ko-KR')}
                              </div>
                              <div className="flex items-center gap-1">
                                <Eye className="w-4 h-4" />
                                {post.view_count}
                              </div>
                              <div className="flex items-center gap-1">
                                <ThumbsUp className="w-4 h-4" />
                                {post.like_count}
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageSquare className="w-4 h-4" />
                                {post.comment_count}
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                      );
                    })()}
                  </div>
                )}

                {activeTab === "news" && (
                  <div className="space-y-4">
                    {/* 카테고리 필터 */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      <button
                        onClick={() => setSelectedNewsType("all")}
                        className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                          selectedNewsType === "all"
                            ? "bg-[#C9A227] text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        전체
                      </button>
                      <button
                        onClick={() => setSelectedNewsType("product_news")}
                        className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                          selectedNewsType === "product_news"
                            ? "bg-[#C9A227] text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        상품
                      </button>
                      <button
                        onClick={() => setSelectedNewsType("store_news")}
                        className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                          selectedNewsType === "store_news"
                            ? "bg-[#C9A227] text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        매장
                      </button>
                      <button
                        onClick={() => setSelectedNewsType("buy_gold")}
                        className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                          selectedNewsType === "buy_gold"
                            ? "bg-[#C9A227] text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        금 매입
                      </button>
                    </div>

                    {/* 게시글 목록 */}
                    {isLoadingPosts ? (
                      <div className="flex items-center justify-center py-page">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                      </div>
                    ) : (() => {
                      const filteredPosts = selectedNewsType === "all"
                        ? posts
                        : posts.filter(p => p.type === selectedNewsType);

                      return filteredPosts.length === 0 ? (
                        <div className="text-center py-page">
                          <p className="text-gray-500">아직 작성된 매장소식이 없습니다.</p>
                        </div>
                      ) : (
                        <>
                          {/* 고정된 게시글 */}
                          {filteredPosts.filter(post => post.is_pinned).map((post) => (
                            <div
                              key={post.id}
                              className="group border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer bg-[#FEF9E7] border-[#C9A227]/30"
                              onClick={() => router.push(`/community/posts/${post.id}`)}
                            >
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2">
                                  <Pin className="w-4 h-4 text-[#C9A227] fill-[#C9A227]" />
                                  <span className="text-xs font-medium text-[#8A6A00]">고정됨</span>
                                  {isNewPost(post.created_at) && (
                                    <span className="flex items-center gap-1 px-2 py-1 text-xs font-bold bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-full shadow-sm">
                                      <Sparkles className="w-3 h-3" />
                                      NEW
                                    </span>
                                  )}
                                  {post.type === 'product_news' && (
                                    <span className="px-2 py-1 text-xs font-semibold bg-[#FEF3C7] text-[#8A6A00] rounded-md">
                                      상품소식
                                    </span>
                                  )}
                                  {post.type === 'store_news' && (
                                    <span className="px-2 py-1 text-xs font-semibold bg-[#FEF3C7] text-[#8A6A00] rounded-md">
                                      매장소식
                                    </span>
                                  )}
                                  {post.type === 'buy_gold' && (
                                    <span className="px-2 py-1 text-xs font-semibold bg-[#FEF3C7] text-[#8A6A00] rounded-md">
                                      금 구매
                                    </span>
                                  )}
                                </div>
                                {isMyStore && (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (!accessToken) return;
                                      const result = await unpinPostAction(post.id, accessToken);
                                      if (result.success) {
                                        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_pinned: false } : p));
                                      }
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 text-xs font-medium text-[#8A6A00] bg-white border border-[#C9A227] rounded-lg hover:bg-[#FEF9E7]"
                                  >
                                    고정 해제
                                  </button>
                                )}
                              </div>

                              <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
                                {post.title}
                              </h3>

                              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                {post.content}
                              </p>

                              {post.image_urls && post.image_urls.length > 0 && (
                                <div className="mb-4 rounded-lg overflow-hidden">
                                  <img
                                    src={post.image_urls[0]}
                                    alt={post.title}
                                    className="w-full h-48 object-cover"
                                  />
                                </div>
                              )}

                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(post.created_at).toLocaleDateString('ko-KR')}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Eye className="w-4 h-4" />
                                  {post.view_count}
                                </div>
                                <div className="flex items-center gap-1">
                                  <ThumbsUp className="w-4 h-4" />
                                  {post.like_count}
                                </div>
                                <div className="flex items-center gap-1">
                                  <MessageSquare className="w-4 h-4" />
                                  {post.comment_count}
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* 일반 게시글 */}
                          {filteredPosts.filter(post => !post.is_pinned).map((post) => (
                            <div
                              key={post.id}
                              className="group border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer"
                              onClick={() => router.push(`/community/posts/${post.id}`)}
                            >
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2">
                                  {isNewPost(post.created_at) && (
                                    <span className="flex items-center gap-1 px-2 py-1 text-xs font-bold bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-full shadow-sm">
                                      <Sparkles className="w-3 h-3" />
                                      NEW
                                    </span>
                                  )}
                                  {post.type === 'product_news' && (
                                    <span className="px-2 py-1 text-xs font-semibold bg-[#FEF3C7] text-[#8A6A00] rounded-md">
                                      상품소식
                                    </span>
                                  )}
                                  {post.type === 'store_news' && (
                                    <span className="px-2 py-1 text-xs font-semibold bg-[#FEF3C7] text-[#8A6A00] rounded-md">
                                      매장소식
                                    </span>
                                  )}
                                  {post.type === 'buy_gold' && (
                                    <span className="px-2 py-1 text-xs font-semibold bg-[#FEF3C7] text-[#8A6A00] rounded-md">
                                      금 구매
                                    </span>
                                  )}
                                </div>
                                {isMyStore && (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (!accessToken) return;
                                      const result = await pinPostAction(post.id, accessToken);
                                      if (result.success) {
                                        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_pinned: true } : p));
                                      }
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                  >
                                    고정
                                  </button>
                                )}
                              </div>

                              <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
                                {post.title}
                              </h3>

                              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                {post.content}
                              </p>

                              {post.image_urls && post.image_urls.length > 0 && (
                                <div className="mb-4 rounded-lg overflow-hidden">
                                  <img
                                    src={post.image_urls[0]}
                                    alt={post.title}
                                    className="w-full h-48 object-cover"
                                  />
                                </div>
                              )}

                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(post.created_at).toLocaleDateString('ko-KR')}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Eye className="w-4 h-4" />
                                  {post.view_count}
                                </div>
                                <div className="flex items-center gap-1">
                                  <ThumbsUp className="w-4 h-4" />
                                  {post.like_count}
                                </div>
                                <div className="flex items-center gap-1">
                                  <MessageSquare className="w-4 h-4" />
                                  {post.comment_count}
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                )}

                {activeTab === "gallery" && (
                  <div>
                    {isLoadingGallery ? (
                      <div className="flex items-center justify-center py-page">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                      </div>
                    ) : gallery.length === 0 ? (
                      <div className="text-center py-page">
                        <p className="text-gray-500">아직 업로드된 이미지가 없습니다.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {gallery.map((item) => (
                          <div
                            key={`${item.post_id}-${item.image_url}`}
                            className="group relative aspect-square rounded-lg overflow-hidden cursor-pointer"
                            onClick={() => router.push(`/community/posts/${item.post_id}`)}
                          >
                            <img
                              src={item.image_url}
                              alt={item.title}
                              className="w-full h-full object-cover transition-transform duration-300 md:group-hover:scale-110"
                            />

                            {/* 호버 오버레이 */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                                <h4 className="font-semibold text-sm mb-1 line-clamp-1">
                                  {item.title}
                                </h4>
                                <p className="text-xs text-gray-200 line-clamp-2 mb-2">
                                  {item.content}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-gray-300">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(item.created_at).toLocaleDateString('ko-KR')}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
                <div className="space-y-3 text-caption">
                  {/* 주소 */}
                  {(store.address || isMyStore) && (
                    <div
                      className={`p-3 rounded-lg transition-all ${
                        isMyStore && editSections.address
                          ? "bg-[#FEF9E7] border-2 border-[#C9A227]/30"
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
                              className="w-full text-caption text-gray-600 bg-transparent border-none outline-none"
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
                            className="px-3 py-1 bg-[#C9A227] hover:bg-[#8A6A00] text-white text-[11px] font-semibold rounded transition-colors"
                          >
                            저장
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 전화번호 */}
                  {(store.phone_number || isMyStore) && (
                    <div
                      className={`p-3 rounded-lg transition-all ${
                        isMyStore && editSections.phone
                          ? "bg-[#FEF9E7] border-2 border-[#C9A227]/30"
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
                              value={formData.phone_number}
                              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                              className="w-full text-caption text-gray-600 bg-transparent border-none outline-none"
                              placeholder="전화번호"
                            />
                          ) : store.phone_number ? (
                            <div className="text-caption text-gray-600">
                              {store.phone_number}
                            </div>
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
                            className="px-3 py-1 bg-[#C9A227] hover:bg-[#8A6A00] text-white text-[11px] font-semibold rounded transition-colors"
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
                          ? "bg-[#FEF9E7] border-2 border-[#C9A227]/30"
                          : isMyStore
                          ? "group bg-gray-50 hover:bg-gray-100 border border-gray-100"
                          : "bg-gray-50 border border-gray-100"
                      }`}
                    >
                      <div className="flex gap-3">
                        <Clock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          {isMyStore && editSections.hours ? (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 w-12 flex-shrink-0">오픈</span>
                                <input
                                  type="time"
                                  value={formData.open_time}
                                  onChange={(e) => setFormData({ ...formData, open_time: e.target.value })}
                                  className="flex-1 text-sm text-gray-900 bg-white border border-gray-300 rounded px-3 py-1.5 outline-none focus:border-[#C9A227] focus:ring-1 focus:ring-[#C9A227]"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 w-12 flex-shrink-0">마감</span>
                                <input
                                  type="time"
                                  value={formData.close_time}
                                  onChange={(e) => setFormData({ ...formData, close_time: e.target.value })}
                                  className="flex-1 text-sm text-gray-900 bg-white border border-gray-300 rounded px-3 py-1.5 outline-none focus:border-[#C9A227] focus:ring-1 focus:ring-[#C9A227]"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="text-caption text-gray-900 font-medium">
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
                            className="px-3 py-1 bg-[#C9A227] hover:bg-[#8A6A00] text-white text-[11px] font-semibold rounded transition-colors"
                          >
                            저장
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 지도 */}
              {store.address && (
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                  <KakaoMap address={store.address} storeName={store.name} />
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
  // slug는 SEO용이므로 params.slug를 받지만 실제 조회는 storeId로 수행

  // storeId가 변경되면 컴포넌트를 완전히 재마운트
  return <StoreDetailContent key={storeId} storeId={storeId} />;
}
