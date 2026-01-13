"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { claimStoreAction } from "@/actions/stores";
import { useAuthStore } from "@/store/auth";
import type { ClaimStoreRequest } from "@/types/stores";

interface StoreClaimModalProps {
  storeId: number;
  storeName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StoreClaimModal({
  storeId,
  storeName,
  open,
  onOpenChange,
}: StoreClaimModalProps) {
  const router = useRouter();
  const { tokens } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ClaimStoreRequest>({
    business_number: "",
    business_start_date: "",
    representative_name: "",
  });

  // 사업자등록번호 포맷팅 (숫자만, 10자리)
  const handleBusinessNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
    setFormData((prev) => ({
      ...prev,
      business_number: value,
    }));
  };

  // 개업일자 포맷팅 (숫자만, 8자리)
  const handleBusinessStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 8);
    setFormData((prev) => ({
      ...prev,
      business_start_date: value,
    }));
  };

  // 폼 검증
  const validateForm = (): boolean => {
    if (formData.business_number.length !== 10) {
      toast.error("사업자등록번호는 10자리 숫자여야 합니다.");
      return false;
    }

    if (formData.business_start_date.length !== 8) {
      toast.error("개업일자는 YYYYMMDD 형식(8자리)이어야 합니다.");
      return false;
    }

    if (!formData.representative_name.trim()) {
      toast.error("대표자명을 입력해주세요.");
      return false;
    }

    return true;
  };

  // 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tokens?.access_token) {
      toast.error("로그인이 필요합니다.");
      router.push("/login");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const result = await claimStoreAction(
        storeId,
        formData,
        tokens.access_token
      );

      if (result.success && result.data) {
        toast.success("매장 소유권이 등록되었습니다!");
        onOpenChange(false);

        // 내 매장 페이지로 이동
        setTimeout(() => {
          router.push("/mystore");
        }, 500);
      } else {
        toast.error(result.error || "매장 소유권 신청에 실패했습니다.");
      }
    } catch (error) {
      console.error("Claim store error:", error);
      toast.error("매장 소유권 신청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>매장 소유권 신청</DialogTitle>
          <DialogDescription>
            <strong>{storeName}</strong>의 소유권을 신청합니다.
            사업자 정보를 입력해주세요.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            사업자 정보는 국세청 API를 통해 자동으로 검증됩니다.
            소유권 등록 후 사업자등록증을 업로드하면 &quot;인증 매장&quot; 뱃지를 받을 수 있습니다.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 사업자등록번호 */}
          <div className="space-y-2">
            <Label htmlFor="business_number">
              사업자등록번호 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="business_number"
              type="text"
              inputMode="numeric"
              placeholder="1234567890 (10자리)"
              value={formData.business_number}
              onChange={handleBusinessNumberChange}
              maxLength={10}
              required
              disabled={loading}
            />
            <p className="text-sm text-muted-foreground">
              하이픈 없이 10자리 숫자만 입력하세요.
            </p>
          </div>

          {/* 개업일자 */}
          <div className="space-y-2">
            <Label htmlFor="business_start_date">
              개업일자 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="business_start_date"
              type="text"
              inputMode="numeric"
              placeholder="20200101 (YYYYMMDD)"
              value={formData.business_start_date}
              onChange={handleBusinessStartDateChange}
              maxLength={8}
              required
              disabled={loading}
            />
            <p className="text-sm text-muted-foreground">
              YYYYMMDD 형식으로 8자리 숫자를 입력하세요.
            </p>
          </div>

          {/* 대표자명 */}
          <div className="space-y-2">
            <Label htmlFor="representative_name">
              대표자명 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="representative_name"
              type="text"
              placeholder="홍길동"
              value={formData.representative_name}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  representative_name: e.target.value,
                }))
              }
              required
              disabled={loading}
            />
          </div>

          {/* 제출 버튼 */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              취소
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                "소유권 신청"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
