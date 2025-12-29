"use client";

import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Store, ArrowLeft, Save, Phone, Clock, MapPin, FileText, Camera, Image as ImageIcon, Tags } from "lucide-react";
import AddressSearchInput from "@/components/AddressSearchInput";
import { useAuthStore } from "@/stores/useAuthStore";
import { getMyStoreAction, updateMyStoreAction, getStoreLocationsAction, getStoresAction } from "@/actions/stores";
import { getPresignedUrlAction, uploadToS3 } from "@/actions/upload";
import { getTagsAction } from "@/actions/tags";
import { UpdateStoreRequestSchema } from "@/schemas/stores";
import type { UpdateStoreRequest } from "@/schemas/stores";
import type { StoreDetail } from "@/types/stores";
import type { Tag } from "@/types/tags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";

interface FormErrors {
  name?: string;
  phone_number?: string;
  region?: string;
  district?: string;
}

export default function MyStoreEditPage() {
  const router = useRouter();
  const { user, isAuthenticated, tokens } = useAuthStore();
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [myStore, setMyStore] = useState<StoreDetail | null>(null);

  // 이미지 업로드 관련
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // 지역 데이터
  const [regions, setRegions] = useState<Array<{ region: string; districts: string[] }>>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);

  // 태그 데이터
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const [formData, setFormData] = useState<UpdateStoreRequest>({
    name: "",
    region: "",
    district: "",
    address: "",
    phone_number: "",
    open_time: "",
    close_time: "",
    description: "",
    image_url: "",
    tag_ids: [],
  });

  // 주소 검색용 분리 필드
  const [zipCode, setZipCode] = useState("");
  const [baseAddress, setBaseAddress] = useState("");
  const [detailAddress, setDetailAddress] = useState("");

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // 로그인되지 않았거나 admin이 아니면 마이페이지로 이동
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    } else if (user?.role !== "admin") {
      toast.error("관리자만 접근할 수 있습니다.");
      router.push("/mypage");
    }
  }, [isAuthenticated, user, router]);

  // 매장 정보 및 지역 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      if (!tokens?.access_token) return;

      try {
        setIsLoading(true);

        // 지역 데이터 로드
        const locationsResult = await getStoreLocationsAction();
        if (locationsResult.success && locationsResult.data) {
          setRegions(locationsResult.data.regions);
        }

        // 태그 데이터 로드
        const tagsResult = await getTagsAction();
        if (tagsResult.success && tagsResult.data) {
          setAllTags(tagsResult.data.tags);
        }

        // 매장 정보 로드
        const result = await getMyStoreAction(tokens.access_token);
        console.log("Store API result:", result);

        if (result.success && result.data?.store) {
          const store = result.data.store;
          console.log("Store data:", store);
          setMyStore(store);

          // 폼 데이터 초기화
          const storeTagIds = store.tags?.map(tag => tag.id) || [];
          setSelectedTagIds(storeTagIds);
          setFormData({
            name: store.name || "",
            region: store.region || "",
            district: store.district || "",
            address: store.address || "",
            phone_number: store.phone_number || "",
            open_time: store.open_time || "",
            close_time: store.close_time || "",
            description: store.description || "",
            image_url: store.image_url || "",
            tag_ids: storeTagIds,
          });
          console.log("Form data set with store info");

          // 지역/구군 초기화
          if (store.region) {
            setSelectedRegion(store.region);
            const regionData = locationsResult.data?.regions.find(
              (r) => r.region === store.region
            );
            if (regionData) {
              setAvailableDistricts(regionData.districts);
            }
          }

          // 주소 파싱
          if (store.address) {
            const match = store.address.match(/^\[(\d+)\]\s*(.+)$/);
            if (match) {
              setZipCode(match[1]);
              setBaseAddress(match[2]);
            } else {
              setBaseAddress(store.address);
            }
          }
        } else {
          console.error("Failed to load store from /users/me/store, trying fallback");
          // Fallback: 전체 매장 목록에서 현재 사용자의 매장 찾기
          const storesResult = await getStoresAction({}, tokens.access_token);
          if (storesResult.success && storesResult.data?.stores) {
            const myStoreFound = storesResult.data.stores.find(
              (store: StoreDetail) => store.user_id === user?.id
            );
            if (myStoreFound) {
              console.log("Found store from fallback:", myStoreFound);
              setMyStore(myStoreFound);

              // 폼 데이터 초기화
              const storeTagIds = myStoreFound.tags?.map(tag => tag.id) || [];
              setSelectedTagIds(storeTagIds);
              setFormData({
                name: myStoreFound.name || "",
                region: myStoreFound.region || "",
                district: myStoreFound.district || "",
                address: myStoreFound.address || "",
                phone_number: myStoreFound.phone_number || "",
                open_time: myStoreFound.open_time || "",
                close_time: myStoreFound.close_time || "",
                description: myStoreFound.description || "",
                image_url: myStoreFound.image_url || "",
                tag_ids: storeTagIds,
              });

              // 지역/구군 초기화
              if (myStoreFound.region) {
                setSelectedRegion(myStoreFound.region);
                const regionData = locationsResult.data?.regions.find(
                  (r) => r.region === myStoreFound.region
                );
                if (regionData) {
                  setAvailableDistricts(regionData.districts);
                }
              }

              // 주소 파싱
              if (myStoreFound.address) {
                const match = myStoreFound.address.match(/^\[(\d+)\]\s*(.+)$/);
                if (match) {
                  setZipCode(match[1]);
                  setBaseAddress(match[2]);
                } else {
                  setBaseAddress(myStoreFound.address);
                }
              }
            } else {
              toast.error("매장 정보를 찾을 수 없습니다.");
            }
          } else {
            toast.error(result.error || "매장 정보를 불러올 수 없습니다.");
          }
        }
      } catch (error) {
        console.error("Failed to load store data:", error);
        toast.error("매장 정보를 불러오는데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [tokens?.access_token]);

  // 주소 필드 합치기
  useEffect(() => {
    const fullAddress = [zipCode && `[${zipCode}]`, baseAddress, detailAddress]
      .filter(Boolean)
      .join(" ");

    if (fullAddress !== formData.address) {
      setFormData((prev) => ({ ...prev, address: fullAddress }));
    }
  }, [zipCode, baseAddress, detailAddress]);

  // 지역 선택 시 구/군 목록 업데이트
  useEffect(() => {
    if (selectedRegion) {
      const regionData = regions.find((r) => r.region === selectedRegion);
      if (regionData) {
        setAvailableDistricts(regionData.districts);
      }
    } else {
      setAvailableDistricts([]);
    }
  }, [selectedRegion, regions]);

  // 성공 시 마이페이지로 이동
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        router.push("/mypage");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, router]);

  /**
   * 단일 필드 검증
   */
  const validateField = (name: string, value: string): string | undefined => {
    try {
      if (name === "name") {
        UpdateStoreRequestSchema.pick({ name: true }).parse({ name: value });
      } else if (name === "phone_number") {
        if (value === "") return undefined;
        UpdateStoreRequestSchema.pick({ phone_number: true }).parse({ phone_number: value });
      }
      return undefined;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "issues" in err) {
        const issues = (err as { issues: Array<{ message: string }> }).issues;
        if (issues && issues.length > 0) {
          return issues[0].message;
        }
      }
      return "유효하지 않은 값입니다.";
    }
  };

  /**
   * 전체 폼 검증
   */
  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    let isValid = true;

    // 매장명 검증
    const nameError = validateField("name", formData.name);
    if (nameError) {
      errors.name = nameError;
      isValid = false;
    }

    // 전화번호 검증 (입력된 경우에만)
    if (formData.phone_number) {
      const phoneError = validateField("phone_number", formData.phone_number);
      if (phoneError) {
        errors.phone_number = phoneError;
        isValid = false;
      }
    }

    setFormErrors(errors);
    return isValid;
  };

  /**
   * 입력값 변경 핸들러
   */
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (formErrors[name as keyof FormErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  /**
   * 포커스 아웃 핸들러
   */
  const handleBlur = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    const error = validateField(name, value);
    if (error) {
      setFormErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  /**
   * 지역 선택 핸들러
   */
  const handleRegionChange = (value: string) => {
    setSelectedRegion(value);
    setFormData((prev) => ({ ...prev, region: value, district: "" }));
  };

  /**
   * 구/군 선택 핸들러
   */
  const handleDistrictChange = (value: string) => {
    setFormData((prev) => ({ ...prev, district: value }));
  };

  /**
   * 태그 토글 핸들러
   */
  const handleTagToggle = (tagId: number) => {
    setSelectedTagIds((prev) => {
      const newTagIds = prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId];

      setFormData((prevForm) => ({ ...prevForm, tag_ids: newTagIds }));
      return newTagIds;
    });
  };

  /**
   * 이미지 업로드 핸들러
   */
  const handleImageClick = () => imageInputRef.current?.click();

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tokens?.access_token) return;

    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("파일 크기는 5MB 이하여야 합니다.");
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }

    // 이미지 파일 타입 체크
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드 가능합니다.");
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }

    setIsUploadingImage(true);
    const loadingToast = toast.loading("매장 이미지 업로드 중...");

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

      // 3. 폼 데이터 업데이트
      setFormData((prev) => ({ ...prev, image_url: file_url }));
      toast.success("매장 이미지가 업로드되었습니다.", { id: loadingToast });
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error(
        error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.",
        { id: loadingToast }
      );
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  /**
   * 폼 제출 핸들러
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setTouched({
      name: true,
      phone_number: true,
      region: true,
      district: true,
    });

    if (!validateForm()) {
      return;
    }

    if (!tokens?.access_token) {
      toast.error("인증 토큰이 없습니다. 다시 로그인해주세요.");
      router.push("/login");
      return;
    }

    setIsPending(true);

    try {
      const result = await updateMyStoreAction(formData, tokens.access_token);

      if (result.success && result.data) {
        setIsSuccess(true);
        toast.success("매장 정보가 성공적으로 업데이트되었습니다!");
      } else {
        toast.error(result.error || "매장 정보 업데이트에 실패했습니다.");
      }
    } catch (error) {
      console.error("Update store error:", error);
      toast.error("매장 정보를 업데이트하는 중 오류가 발생했습니다.");
    } finally {
      setIsPending(false);
    }
  };

  if (!isAuthenticated || user?.role !== "admin") {
    return null;
  }

  if (isLoading) {
    return (
      <main className="flex-grow py-8 bg-gray-50">
        <section className="container mx-auto px-4 max-w-3xl">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-gray-900" />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex-grow py-8 bg-gray-50">
      <section className="container mx-auto px-4 max-w-3xl">
        {/* Page Header */}
        <div className="mb-6">
          <Button
            onClick={() => router.push("/mypage")}
            variant="outline"
            size="sm"
            className="gap-2 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            마이페이지로 돌아가기
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">매장 정보 수정</h1>
          <p className="mt-1 text-sm text-gray-600">수정할 항목의 내용을 변경하세요</p>
        </div>

        {/* 매장 이미지 카드 */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col items-center">
              <div className="relative group mb-4">
                <div
                  onClick={handleImageClick}
                  className="w-40 h-40 rounded-lg overflow-hidden border-4 border-gray-100 cursor-pointer transition-opacity hover:opacity-80"
                >
                  <div className={`w-full h-full ${formData.image_url ? "bg-white" : "bg-gray-100"} flex items-center justify-center`}>
                    {formData.image_url ? (
                      <Image
                        src={formData.image_url}
                        alt="매장 이미지"
                        width={160}
                        height={160}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Store className="w-16 h-16 text-gray-400" />
                    )}
                  </div>
                </div>
                {/* 카메라 아이콘 오버레이 */}
                <div
                  className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={handleImageClick}
                >
                  {isUploadingImage ? (
                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-10 h-10 text-white" />
                  )}
                </div>
                {/* Hidden file input */}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={isUploadingImage}
                />
              </div>
              <p className="text-sm text-gray-600">매장 이미지를 클릭하여 변경</p>
              <p className="text-xs text-gray-500 mt-1">JPG, PNG (최대 5MB)</p>
            </div>
          </CardContent>
        </Card>

        {/* Form Card */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 매장명 */}
              <div>
                <Label htmlFor="name" className="flex items-center gap-2 mb-2">
                  <Store className="w-4 h-4" />
                  매장명 <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`h-12 ${
                    touched.name && formErrors.name ? "border-red-500" : ""
                  }`}
                  placeholder="우동금 본점"
                  disabled={isPending}
                  required
                />
                {touched.name && formErrors.name && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>
                )}
              </div>

              {/* 지역 선택 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="region" className="mb-2 block">
                    지역
                  </Label>
                  <Select
                    value={formData.region}
                    onValueChange={handleRegionChange}
                    disabled={isPending}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="지역 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((r) => (
                        <SelectItem key={r.region} value={r.region}>
                          {r.region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="district" className="mb-2 block">
                    구/군
                  </Label>
                  <Select
                    value={formData.district}
                    onValueChange={handleDistrictChange}
                    disabled={isPending || !selectedRegion}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="구/군 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDistricts.map((district) => (
                        <SelectItem key={district} value={district}>
                          {district}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 연락처 */}
              <div>
                <Label htmlFor="phone_number" className="flex items-center gap-2 mb-2">
                  <Phone className="w-4 h-4" />
                  연락처
                </Label>
                <Input
                  type="tel"
                  id="phone_number"
                  name="phone_number"
                  value={formData.phone_number || ""}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`h-12 ${
                    touched.phone_number && formErrors.phone_number
                      ? "border-red-500"
                      : ""
                  }`}
                  placeholder="010-1234-5678"
                  disabled={isPending}
                />
                {touched.phone_number && formErrors.phone_number && (
                  <p className="text-sm text-red-500 mt-1">
                    {formErrors.phone_number}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  형식: 010-1234-5678 또는 01012345678
                </p>
              </div>

              {/* 영업시간 */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4" />
                  영업시간
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="open_time" className="text-sm text-gray-600 mb-1 block">
                      오픈시간
                    </Label>
                    <Input
                      type="time"
                      id="open_time"
                      name="open_time"
                      value={formData.open_time || ""}
                      onChange={handleChange}
                      className="h-12"
                      disabled={isPending}
                    />
                  </div>
                  <div>
                    <Label htmlFor="close_time" className="text-sm text-gray-600 mb-1 block">
                      마감시간
                    </Label>
                    <Input
                      type="time"
                      id="close_time"
                      name="close_time"
                      value={formData.close_time || ""}
                      onChange={handleChange}
                      className="h-12"
                      disabled={isPending}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  매장의 오픈 시간과 마감 시간을 입력하세요
                </p>
              </div>

              {/* 매장 태그 */}
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <Tags className="w-4 h-4" />
                  매장 태그
                </Label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={selectedTagIds.includes(tag.id) ? "default" : "outline"}
                      className={`cursor-pointer transition-all ${
                        selectedTagIds.includes(tag.id)
                          ? "bg-gray-900 text-white hover:bg-gray-800"
                          : "hover:bg-gray-100"
                      }`}
                      onClick={() => handleTagToggle(tag.id)}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  매장의 특징을 나타내는 태그를 선택하세요 (복수 선택 가능)
                </p>
              </div>

              {/* 주소 */}
              <div>
                <Label className="flex items-center gap-2 mb-4">
                  <MapPin className="w-4 h-4" />
                  매장 주소
                </Label>
                <AddressSearchInput
                  zipCode={zipCode}
                  address={baseAddress}
                  detailAddress={detailAddress}
                  onZipCodeChange={setZipCode}
                  onAddressChange={setBaseAddress}
                  onDetailAddressChange={setDetailAddress}
                  labels={{
                    zipCode: "우편번호 (선택)",
                    address: "기본 주소",
                    detailAddress: "상세 주소 (선택)",
                  }}
                  placeholders={{
                    zipCode: "우편번호",
                    address: "주소 검색 버튼을 클릭하세요",
                    detailAddress: "동/호수, 건물명 등",
                  }}
                  required={{ address: false }}
                />
                <p className="text-xs text-gray-500 mt-2">
                  매장의 위치를 정확히 입력하세요
                </p>
              </div>

              {/* 매장 설명 */}
              <div>
                <Label htmlFor="description" className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4" />
                  매장 설명
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description || ""}
                  onChange={handleChange}
                  className="min-h-[120px] resize-none"
                  placeholder="매장에 대한 간단한 설명을 입력하세요"
                  disabled={isPending}
                />
                <p className="text-xs text-gray-500 mt-1">
                  매장의 특징이나 안내사항을 입력하세요
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button
                  type="button"
                  onClick={() => router.push("/mypage")}
                  variant="outline"
                  disabled={isPending}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  className="gap-2 bg-gray-900 hover:bg-gray-800 text-white"
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span>저장 중...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>변경사항 저장</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
