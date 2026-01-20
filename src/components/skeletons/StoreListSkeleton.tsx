import { Skeleton } from "@/components/ui/skeleton";

/**
 * 매장 목록 스켈레톤 - 로딩 중 표시
 */
export function StoreCardSkeleton() {
  return (
    <div className="p-3 md:p-5 border-b border-gray-100">
      <div className="flex gap-3 md:gap-4">
        {/* 매장 이미지 스켈레톤 */}
        <Skeleton className="w-16 h-16 md:w-20 md:h-20 rounded-xl flex-shrink-0" />

        {/* 매장 정보 스켈레톤 */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* 매장명 + 뱃지 */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-32 md:w-40" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-12" />
          </div>

          {/* 주소 */}
          <Skeleton className="h-4 w-full max-w-[200px]" />

          {/* 거리 + 태그 */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 매장 목록 전체 스켈레톤 - 여러 카드 표시
 */
export function StoreListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: count }).map((_, index) => (
        <StoreCardSkeleton key={index} />
      ))}
    </div>
  );
}
