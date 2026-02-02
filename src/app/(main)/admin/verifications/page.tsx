"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  getVerificationsListAction,
  reviewVerificationAction,
} from "@/actions/stores";
import type { VerificationWithStore } from "@/types/stores";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  ExternalLink,
  Store,
} from "lucide-react";
// Image 컴포넌트 제거 - 일반 img 태그 사용
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function VerificationsPage() {
  const router = useRouter();
  const { user, tokens, isAuthenticated } = useAuthStore();
  const [verifications, setVerifications] = useState<VerificationWithStore[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<
    "pending" | "approved" | "rejected" | "all"
  >("pending");
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedVerification, setSelectedVerification] =
    useState<VerificationWithStore | null>(null);

  // 권한 체크
  useEffect(() => {
    if (!isAuthenticated || !tokens?.access_token) {
      router.push("/login");
      return;
    }

    if (user?.role !== "master") {
      toast.error("접근 권한이 없습니다.");
      router.push("/");
      return;
    }
  }, [isAuthenticated, tokens, user, router]);

  // 인증 요청 목록 조회
  useEffect(() => {
    if (!tokens?.access_token || user?.role !== "master") return;

    const fetchVerifications = async () => {
      setLoading(true);
      const result = await getVerificationsListAction(tokens.access_token, {
        status: statusFilter === "all" ? undefined : statusFilter,
      });

      if (result.success && result.data) {
        setVerifications(result.data.verifications);
      } else {
        toast.error(result.error || "인증 요청 목록 조회에 실패했습니다.");
      }
      setLoading(false);
    };

    fetchVerifications();
  }, [tokens, user, statusFilter]);

  // 승인 처리
  const handleApprove = async (verificationId: number) => {
    if (!tokens?.access_token) return;

    setReviewingId(verificationId);
    const result = await reviewVerificationAction(
      verificationId,
      { action: "approve" },
      tokens.access_token
    );

    if (result.success) {
      toast.success("인증이 승인되었습니다.");
      // 목록 새로고침
      setVerifications((prev) =>
        prev.map((v) =>
          v.id === verificationId
            ? { ...v, status: "approved", reviewed_at: new Date().toISOString() }
            : v
        )
      );
    } else {
      toast.error(result.error || "인증 승인에 실패했습니다.");
    }
    setReviewingId(null);
  };

  // 거부 다이얼로그 열기
  const openRejectDialog = (verification: VerificationWithStore) => {
    setSelectedVerification(verification);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  // 거부 처리
  const handleReject = async () => {
    if (!tokens?.access_token || !selectedVerification) return;

    if (!rejectionReason.trim()) {
      toast.error("반려 사유를 입력해주세요.");
      return;
    }

    setReviewingId(selectedVerification.id);
    const result = await reviewVerificationAction(
      selectedVerification.id,
      { action: "reject", reason: rejectionReason },
      tokens.access_token
    );

    if (result.success) {
      toast.success("인증이 거부되었습니다.");
      // 목록 새로고침
      setVerifications((prev) =>
        prev.map((v) =>
          v.id === selectedVerification.id
            ? {
                ...v,
                status: "rejected",
                reviewed_at: new Date().toISOString(),
                rejection_reason: rejectionReason,
              }
            : v
        )
      );
      setRejectDialogOpen(false);
      setSelectedVerification(null);
    } else {
      toast.error(result.error || "인증 거부에 실패했습니다.");
    }
    setReviewingId(null);
  };

  // 상태 뱃지
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
            <Clock className="w-4 h-4" />
            대기중
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            승인됨
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
            <XCircle className="w-4 h-4" />
            거부됨
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">매장 인증 관리</h1>
          <p className="text-gray-600 mt-2">
            매장 사업자등록증 인증 요청을 검토하고 승인/거부할 수 있습니다.
          </p>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-2">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              onClick={() => setStatusFilter("all")}
            >
              전체
            </Button>
            <Button
              variant={statusFilter === "pending" ? "default" : "outline"}
              onClick={() => setStatusFilter("pending")}
            >
              대기중
            </Button>
            <Button
              variant={statusFilter === "approved" ? "default" : "outline"}
              onClick={() => setStatusFilter("approved")}
            >
              승인됨
            </Button>
            <Button
              variant={statusFilter === "rejected" ? "default" : "outline"}
              onClick={() => setStatusFilter("rejected")}
            >
              거부됨
            </Button>
          </div>
        </div>

        {/* 인증 요청 목록 */}
        {verifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">인증 요청이 없습니다.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {verifications.map((verification) => (
              <div
                key={verification.id}
                className="bg-white rounded-lg shadow-sm p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <Store className="w-6 h-6 text-gray-400 mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {verification.store?.name || "매장명 없음"}
                      </h3>
                      {verification.store?.address && (
                        <p className="text-sm text-gray-600 mt-1">
                          {verification.store.address}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        신청일:{" "}
                        {new Date(
                          verification.submitted_at || verification.created_at
                        ).toLocaleString("ko-KR")}
                      </p>
                    </div>
                  </div>
                  <div>{getStatusBadge(verification.status)}</div>
                </div>

                {/* 사업자등록증 이미지 */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    사업자등록증
                  </h4>
                  <div className="relative w-full max-w-2xl border rounded-lg overflow-hidden bg-gray-50">
                    <img
                      src={verification.business_license_url}
                      alt="사업자등록증"
                      className="w-full h-auto max-h-[600px] object-contain"
                      onClick={() => window.open(verification.business_license_url, "_blank")}
                      style={{ cursor: "pointer" }}
                    />
                    <a
                      href={verification.business_license_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-2 right-2 p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
                      title="새 탭에서 열기"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* 거부 사유 (거부된 경우) */}
                {verification.status === "rejected" &&
                  verification.rejection_reason && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm font-medium text-red-900 mb-1">
                        반려 사유
                      </p>
                      <p className="text-sm text-red-700">
                        {verification.rejection_reason}
                      </p>
                    </div>
                  )}

                {/* 액션 버튼 (대기중일 때만) */}
                {verification.status === "pending" && (
                  <div className="flex gap-2 mt-6">
                    <Button
                      onClick={() => handleApprove(verification.id)}
                      disabled={reviewingId === verification.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {reviewingId === verification.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          처리 중...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          승인
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => openRejectDialog(verification)}
                      disabled={reviewingId === verification.id}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      거부
                    </Button>
                  </div>
                )}

                {/* 검토 완료 정보 */}
                {verification.reviewed_at && (
                  <p className="text-xs text-gray-500 mt-4">
                    검토일:{" "}
                    {new Date(verification.reviewed_at).toLocaleString("ko-KR")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 거부 다이얼로그 */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>인증 거부</DialogTitle>
            <DialogDescription>
              인증을 거부하는 사유를 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="거부 사유를 입력하세요..."
              rows={4}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              취소
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              거부하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
