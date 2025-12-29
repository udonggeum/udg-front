"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Plus, Edit, Trash2, Star, ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  getAddressesAction,
  addAddressAction,
  updateAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
} from "@/actions/address";
import type { Address, AddToAddressRequest } from "@/types/address";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import AddressFormModal from "@/components/address-form-modal";
import { toast } from "sonner";

export default function AddressManagementPage() {
  const router = useRouter();
  const { isAuthenticated, tokens } = useAuthStore();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  // 로그인되지 않았으면 로그인 페이지로 이동
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // 주소 목록 로드
  const loadAddresses = async () => {
    if (!tokens?.access_token) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getAddressesAction(tokens.access_token);

      if (result.success && result.data) {
        setAddresses(result.data.addresses);
      } else {
        setError(result.error || "주소 목록을 불러올 수 없습니다.");
      }
    } catch (err) {
      setError("주소 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && tokens?.access_token) {
      loadAddresses();
    }
  }, [isAuthenticated, tokens?.access_token]);

  /**
   * 주소 추가 모달 열기
   */
  const handleAddAddress = () => {
    setEditingAddress(null);
    setIsModalOpen(true);
  };

  /**
   * 주소 수정 모달 열기
   */
  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setIsModalOpen(true);
  };

  /**
   * 주소 삭제
   */
  const handleDeleteAddress = async (id: number) => {
    if (!confirm("이 배송지를 삭제하시겠습니까?")) return;
    if (!tokens?.access_token) return;

    try {
      const result = await deleteAddressAction(id, tokens.access_token);

      if (result.success) {
        toast.success("배송지가 삭제되었습니다.");
        await loadAddresses();
      } else {
        toast.error(result.error || "주소 삭제에 실패했습니다.");
      }
    } catch (err) {
      toast.error("주소 삭제 중 오류가 발생했습니다.");
    }
  };

  /**
   * 기본 주소 설정
   */
  const handleSetDefaultAddress = async (id: number) => {
    if (!tokens?.access_token) return;

    try {
      const result = await setDefaultAddressAction(id, tokens.access_token);

      if (result.success) {
        toast.success("기본 배송지로 설정되었습니다.");
        await loadAddresses();
      } else {
        toast.error(result.error || "기본 주소 설정에 실패했습니다.");
      }
    } catch (err) {
      toast.error("기본 주소 설정 중 오류가 발생했습니다.");
    }
  };

  /**
   * 모달 닫기
   */
  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingAddress(null);
  };

  /**
   * 주소 추가/수정 제출
   */
  const handleSubmitAddress = async (data: AddToAddressRequest) => {
    if (!tokens?.access_token) {
      throw new Error("인증 토큰이 없습니다.");
    }

    if (editingAddress) {
      // 수정
      const result = await updateAddressAction(editingAddress.id, data, tokens.access_token);
      if (result.success) {
        toast.success("배송지가 수정되었습니다.");
        await loadAddresses();
      } else {
        throw new Error(result.error || "주소 수정에 실패했습니다.");
      }
    } else {
      // 추가
      const result = await addAddressAction(data, tokens.access_token);
      if (result.success) {
        toast.success("배송지가 추가되었습니다.");
        await loadAddresses();
      } else {
        throw new Error(result.error || "주소 추가에 실패했습니다.");
      }
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="flex-grow">
      <section className="container mx-auto px-4 py-10">
        {/* Page Header */}
        <div className="mb-8">
          <Button
            onClick={() => router.push("/mypage")}
            variant="outline"
            size="sm"
            className="gap-2 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            마이페이지로 돌아가기
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">배송지 관리</h1>
              <p className="mt-2 text-gray-600">배송지를 추가하고 관리하세요</p>
            </div>
            <Button onClick={handleAddAddress} className="gap-2 bg-gray-900 hover:bg-gray-800 text-white">
              <Plus size={20} />
              배송지 추가
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-gray-900" />
          </div>
        ) : error ? (
          /* Error State */
          <div className="flex flex-col items-center justify-center py-20">
            <Alert variant="destructive" className="max-w-md">
              <AlertTitle>배송지 목록을 불러올 수 없습니다</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={loadAddresses} className="mt-6 bg-gray-900 hover:bg-gray-800 text-white">
              다시 시도
            </Button>
          </div>
        ) : addresses.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center rounded-xl bg-gray-50 py-20 text-center">
            <MapPin size={64} className="text-gray-400 mb-6" />
            <h2 className="text-xl font-semibold mb-2">등록된 배송지가 없습니다</h2>
            <p className="text-gray-600 mb-6">새로운 배송지를 추가해보세요</p>
            <Button onClick={handleAddAddress} className="gap-2 bg-gray-900 hover:bg-gray-800 text-white">
              <Plus size={20} />
              배송지 추가
            </Button>
          </div>
        ) : (
          /* Address List */
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {addresses.map((address) => (
              <div key={address.id} className="relative">
                {/* 기본 배송지 뱃지 */}
                {address.is_default && (
                  <div className="absolute -top-2 left-4 z-10">
                    <Badge className="gap-1 shadow-md bg-gray-900 text-white">
                      <Star size={12} fill="currentColor" />
                      기본 배송지
                    </Badge>
                  </div>
                )}

                <Card
                  className={`${
                    address.is_default ? "ring-2 ring-gray-900" : ""
                  } hover:shadow-lg transition-shadow`}
                >
                  <CardContent className="pt-6">
                    {/* 배송지명 */}
                    <h3 className="text-lg font-bold mb-3">{address.name}</h3>

                    {/* 주소 상세 정보 */}
                    <div className="space-y-1 text-sm text-gray-600 mb-4">
                      <p>{address.recipient}</p>
                      <p>{address.phone}</p>
                      <div className="mt-2">
                        {address.zip_code && <p className="text-xs">({address.zip_code})</p>}
                        <p>{address.address}</p>
                        {address.detail_address && <p>{address.detail_address}</p>}
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex flex-wrap gap-2 justify-end mt-4">
                      {!address.is_default && (
                        <Button
                          onClick={() => handleSetDefaultAddress(address.id)}
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                        >
                          <Star size={16} />
                          기본 배송지로 설정
                        </Button>
                      )}
                      <Button
                        onClick={() => handleEditAddress(address)}
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                      >
                        <Edit size={16} />
                        수정
                      </Button>
                      <Button
                        onClick={() => handleDeleteAddress(address.id)}
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                        삭제
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 주소 폼 모달 */}
      <AddressFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        address={editingAddress}
        onSubmit={handleSubmitAddress}
      />
    </main>
  );
}
