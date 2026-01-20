import { Skeleton } from "@/components/ui/skeleton";

/**
 * 게시글 상세 페이지 스켈레톤 - 로딩 중 표시
 */
export function PostDetailSkeleton() {
  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header - 모바일에서만 표시 */}
      <div className="sm:hidden bg-white border-b border-gray-200 sticky top-[60px] z-40">
        <div className="max-w-[900px] mx-auto px-page py-4">
          <Skeleton className="h-6 w-6" />
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="max-w-[900px] mx-auto px-page py-6">
        {/* 제목 */}
        <div className="mb-4">
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-8 w-1/2" />
        </div>

        {/* 프로필 + 정보 */}
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-9 w-16" />
        </div>

        {/* 금 거래 정보 (옵션) */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>

        {/* 이미지 */}
        <Skeleton className="w-full aspect-video rounded-2xl mb-6" />

        {/* 본문 */}
        <div className="space-y-3 mb-8">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* 댓글 섹션 */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-8" />
          </div>

          {/* 댓글 카드 3개 */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="mb-4 pb-4 border-b border-gray-100 last:border-0">
              <div className="flex gap-3">
                <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <div className="flex items-center gap-3 mt-2">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
