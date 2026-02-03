"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiClient } from "@/lib/axios";
import { Loader2 } from "lucide-react";

export default function GoldPriceImportPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // 권한 체크
  useEffect(() => {
    if (!isAuthenticated) {
      toast.error("로그인이 필요합니다");
      router.push("/login");
      return;
    }

    if (user?.role !== "master") {
      toast.error("접근 권한이 없습니다");
      router.push("/");
      return;
    }
  }, [isAuthenticated, user, router]);

  // master 권한이 아니면 아무것도 렌더링하지 않음
  if (!isAuthenticated || user?.role !== "master") {
    return null;
  }

  const handleImport = async () => {
    if (!startDate || !endDate) {
      toast.error("시작일과 종료일을 모두 입력해주세요");
      return;
    }

    // YYYY-MM-DD → YYYYMMDD 형식으로 변환
    const formattedStartDate = startDate.replace(/-/g, "");
    const formattedEndDate = endDate.replace(/-/g, "");

    // 날짜 유효성 검사
    if (formattedStartDate.length !== 8 || formattedEndDate.length !== 8) {
      toast.error("올바른 날짜 형식이 아닙니다");
      return;
    }

    if (formattedStartDate > formattedEndDate) {
      toast.error("시작일은 종료일보다 이전이어야 합니다");
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.post("/gold-prices/import", {
        start_date: formattedStartDate,
        end_date: formattedEndDate,
      });

      if (response.data.success) {
        toast.success(
          `금시세 데이터를 성공적으로 가져왔습니다 (${response.data.data.imported_count}건)`
        );
        // 입력 필드 초기화
        setStartDate("");
        setEndDate("");
      }
    } catch (error: any) {
      console.error("금시세 임포트 실패:", error);
      const errorMessage =
        error.response?.data?.message || "금시세 데이터를 가져오는데 실패했습니다";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>금시세 데이터 임포트</CardTitle>
          <CardDescription>
            KRX API에서 과거 금시세 데이터를 가져와서 저장합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="startDate">시작일</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isLoading}
              max={new Date().toISOString().split("T")[0]}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">종료일</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isLoading}
              max={new Date().toISOString().split("T")[0]}
            />
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
            <p className="font-medium">참고사항:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>KRX API에서 24K, 18K, 14K, 백금, 은 시세를 가져옵니다</li>
              <li>이미 저장된 날짜의 데이터는 건너뜁니다</li>
              <li>한 번에 많은 데이터를 가져올 경우 시간이 걸릴 수 있습니다</li>
            </ul>
          </div>

          <Button
            onClick={handleImport}
            disabled={isLoading || !startDate || !endDate}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                데이터 가져오는 중...
              </>
            ) : (
              "데이터 가져오기"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
