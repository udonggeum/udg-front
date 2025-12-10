"use client";

import { useState, useEffect, type FormEvent, type ChangeEvent } from "react";
import { X } from "lucide-react";
import { AddToAddressRequestSchema } from "@/schemas/address";
import type { Address, AddToAddressRequest } from "@/types/address";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FormErrors {
  name?: string;
  recipient?: string;
  phone?: string;
  zip_code?: string;
  address?: string;
  detail_address?: string;
}

interface AddressFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  address?: Address | null;
  onSubmit: (data: AddToAddressRequest) => Promise<void>;
}

export default function AddressFormModal({
  isOpen,
  onClose,
  address,
  onSubmit,
}: AddressFormModalProps) {
  const isEditMode = !!address;
  const [isPending, setIsPending] = useState(false);

  const [formData, setFormData] = useState<AddToAddressRequest>({
    name: address?.name || "",
    recipient: address?.recipient || "",
    phone: address?.phone || "",
    zip_code: address?.zip_code || "",
    address: address?.address || "",
    detail_address: address?.detail_address || "",
    is_default: address?.is_default || false,
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  // 모달이 열리거나 주소가 변경될 때 폼 리셋
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: address?.name || "",
        recipient: address?.recipient || "",
        phone: address?.phone || "",
        zip_code: address?.zip_code || "",
        address: address?.address || "",
        detail_address: address?.detail_address || "",
        is_default: address?.is_default || false,
      });
      setFormErrors({});
      setTouched({});
      setApiError(null);
    }
  }, [isOpen, address]);

  /**
   * 단일 필드 검증
   */
  const validateField = (name: string, value: string | boolean): string | undefined => {
    try {
      if (name === "name") {
        AddToAddressRequestSchema.pick({ name: true }).parse({ name: value });
      } else if (name === "recipient") {
        AddToAddressRequestSchema.pick({ recipient: true }).parse({ recipient: value });
      } else if (name === "phone") {
        AddToAddressRequestSchema.pick({ phone: true }).parse({ phone: value });
      } else if (name === "zip_code") {
        // 빈 값 허용 (선택사항)
        if (value === "") return undefined;
        AddToAddressRequestSchema.pick({ zip_code: true }).parse({ zip_code: value });
      } else if (name === "address") {
        AddToAddressRequestSchema.pick({ address: true }).parse({ address: value });
      } else if (name === "detail_address") {
        AddToAddressRequestSchema.pick({ detail_address: true }).parse({ detail_address: value });
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

    // 필수 필드 검증
    const nameError = validateField("name", formData.name);
    if (nameError) {
      errors.name = nameError;
      isValid = false;
    }

    const recipientError = validateField("recipient", formData.recipient);
    if (recipientError) {
      errors.recipient = recipientError;
      isValid = false;
    }

    const phoneError = validateField("phone", formData.phone);
    if (phoneError) {
      errors.phone = phoneError;
      isValid = false;
    }

    const addressError = validateField("address", formData.address);
    if (addressError) {
      errors.address = addressError;
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  /**
   * 입력값 변경 핸들러
   */
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // 터치된 필드의 에러 실시간 업데이트
    if (touched[name]) {
      const error = validateField(name, value);
      setFormErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  /**
   * 체크박스 변경 핸들러
   */
  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, is_default: checked }));
  };

  /**
   * 포커스 아웃 핸들러
   */
  const handleBlur = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    const error = validateField(name, value);
    setFormErrors((prev) => ({ ...prev, [name]: error }));
  };

  /**
   * 폼 제출 핸들러
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // 모든 필드를 터치 상태로 설정
    setTouched({
      name: true,
      recipient: true,
      phone: true,
      zip_code: true,
      address: true,
      detail_address: true,
    });

    // 폼 검증
    if (!validateForm()) {
      return;
    }

    setIsPending(true);
    setApiError(null);

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "작업에 실패했습니다.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {isEditMode ? "배송지 수정" : "배송지 추가"}
          </DialogTitle>
        </DialogHeader>

        {/* API 에러 */}
        {apiError && (
          <Alert variant="destructive">
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
        )}

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 배송지명 */}
          <div>
            <Label htmlFor="name">배송지명</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="예: 집, 회사"
              className={touched.name && formErrors.name ? "border-red-500" : ""}
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isPending}
            />
            {touched.name && formErrors.name && (
              <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>
            )}
          </div>

          {/* 받는 사람 */}
          <div>
            <Label htmlFor="recipient">받는 사람</Label>
            <Input
              id="recipient"
              name="recipient"
              type="text"
              placeholder="홍길동"
              className={touched.recipient && formErrors.recipient ? "border-red-500" : ""}
              value={formData.recipient}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isPending}
            />
            {touched.recipient && formErrors.recipient && (
              <p className="text-sm text-red-500 mt-1">{formErrors.recipient}</p>
            )}
          </div>

          {/* 전화번호 */}
          <div>
            <Label htmlFor="phone">전화번호</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="010-1234-5678"
              className={touched.phone && formErrors.phone ? "border-red-500" : ""}
              value={formData.phone}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isPending}
            />
            {touched.phone && formErrors.phone && (
              <p className="text-sm text-red-500 mt-1">{formErrors.phone}</p>
            )}
          </div>

          {/* 우편번호 */}
          <div>
            <Label htmlFor="zip_code">우편번호 (선택)</Label>
            <div className="flex gap-2">
              <Input
                id="zip_code"
                name="zip_code"
                type="text"
                placeholder="12345"
                maxLength={5}
                className={touched.zip_code && formErrors.zip_code ? "border-red-500" : ""}
                value={formData.zip_code}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isPending}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => alert("우편번호 검색 기능은 추후 추가될 예정입니다.")}
                disabled={isPending}
              >
                우편번호 검색
              </Button>
            </div>
            {touched.zip_code && formErrors.zip_code && (
              <p className="text-sm text-red-500 mt-1">{formErrors.zip_code}</p>
            )}
          </div>

          {/* 기본 주소 */}
          <div>
            <Label htmlFor="address">기본 주소</Label>
            <Input
              id="address"
              name="address"
              type="text"
              placeholder="서울시 강남구 테헤란로 123"
              className={touched.address && formErrors.address ? "border-red-500" : ""}
              value={formData.address}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isPending}
            />
            {touched.address && formErrors.address && (
              <p className="text-sm text-red-500 mt-1">{formErrors.address}</p>
            )}
          </div>

          {/* 상세 주소 */}
          <div>
            <Label htmlFor="detail_address">상세 주소 (선택)</Label>
            <Input
              id="detail_address"
              name="detail_address"
              type="text"
              placeholder="동/호수, 건물명 등"
              className={touched.detail_address && formErrors.detail_address ? "border-red-500" : ""}
              value={formData.detail_address}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isPending}
            />
            {touched.detail_address && formErrors.detail_address && (
              <p className="text-sm text-red-500 mt-1">{formErrors.detail_address}</p>
            )}
          </div>

          {/* 기본 배송지 설정 */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_default"
              checked={formData.is_default}
              onCheckedChange={handleCheckboxChange}
              disabled={isPending}
            />
            <Label htmlFor="is_default" className="cursor-pointer">
              기본 배송지로 설정
            </Label>
          </div>

          {/* 액션 버튼 */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              취소
            </Button>
            <Button type="submit" disabled={isPending} className="bg-gray-900 hover:bg-gray-800">
              {isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  {isEditMode ? "수정 중..." : "추가 중..."}
                </>
              ) : (
                <>{isEditMode ? "수정" : "추가"}</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
