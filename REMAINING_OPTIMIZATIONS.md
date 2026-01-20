# 남은 앱뷰 최적화 항목

## ✅ 이미 완료된 것들

1. ✅ viewport 및 앱 메타데이터
2. ✅ Safe Area 대응 (노치/홈 인디케이터)
3. ✅ 터치 최적화 (탭 하이라이트, 터치 영역)
4. ✅ 웹뷰 감지 및 네이티브 통신 준비
5. ✅ 뒤로가기 처리 (네이티브 연동 준비)
6. ✅ 키보드 대응 (자동 스크롤, 높이 조정)
7. ✅ WebSocket 앱 라이프사이클 대응
8. ✅ 모든 UI 요소 크기 최적화
   - 버튼, 입력 필드, 텍스트, 태그, 카드, 아이콘 등
9. ✅ 반응형 레이아웃 (화면 크기별 대응)
10. ✅ 고해상도 디스플레이 대응

---

## 🚀 웹에서 바로 추가할 수 있는 것들

### 1. **Pull to Refresh (아래로 당겨서 새로고침)**

**난이도**: ⭐⭐
**효과**: 앱처럼 느껴지는 UX

```tsx
// 구현 예시
const usePullToRefresh = (onRefresh: () => void) => {
  useEffect(() => {
    let startY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0].clientY;
      if (currentY - startY > 100 && window.scrollY === 0) {
        onRefresh();
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [onRefresh]);
};
```

**필요한 페이지**:
- 매장 목록
- 커뮤니티 글 목록
- 금시세 페이지

---

### 2. **오프라인 지원 (Service Worker)**

**난이도**: ⭐⭐⭐
**효과**: 오프라인에서도 기본 화면 표시

```tsx
// public/sw.js 생성
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then((cache) => {
      return cache.addAll([
        '/',
        '/stores',
        '/community',
        '/prices',
      ]);
    })
  );
});
```

**장점**:
- 네트워크 없어도 기본 화면 표시
- 이전 데이터 캐싱
- 빠른 로딩

---

### 3. **앱 아이콘 & 스플래시 스크린**

**난이도**: ⭐
**효과**: 진짜 앱처럼 보임

```html
<!-- layout.tsx에 추가 -->
<link rel="icon" href="/favicon.ico" />
<link rel="apple-touch-icon" href="/icon-192x192.png" />
<link rel="manifest" href="/manifest.json" />

<!-- public/manifest.json 생성 -->
{
  "name": "우리동네금은방",
  "short_name": "우동금",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "theme_color": "#C9A227",
  "background_color": "#FFFFFF",
  "display": "standalone",
  "orientation": "portrait"
}
```

**필요한 파일**:
- `/public/favicon.ico`
- `/public/icon-192x192.png`
- `/public/icon-512x512.png`
- `/public/manifest.json`

---

### 4. **스켈레톤 로딩 (Skeleton Screen)**

**난이도**: ⭐⭐
**효과**: 빠르게 느껴지는 UX

```tsx
// 매장 카드 스켈레톤
<div className="animate-pulse">
  <div className="h-48 bg-gray-200 rounded-2xl mb-3" />
  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
  <div className="h-3 bg-gray-200 rounded w-1/2" />
</div>
```

**적용 위치**:
- 매장 목록 로딩 시
- 커뮤니티 글 목록 로딩 시
- 글 상세 로딩 시

---

### 5. **무한 스크롤 성능 개선**

**난이도**: ⭐⭐
**효과**: 부드러운 스크롤

```tsx
// Intersection Observer 최적화
const observerOptions = {
  root: null,
  rootMargin: '100px', // 미리 로드
  threshold: 0.1,
};
```

**이미 사용 중**: 커뮤니티 페이지 (Virtuoso)
**추가 가능**: 매장 목록, 채팅 목록

---

### 6. **이미지 최적화**

**난이도**: ⭐⭐
**효과**: 빠른 로딩, 데이터 절약

```tsx
// Next.js Image 컴포넌트 활용
<Image
  src={imageUrl}
  alt="매장 이미지"
  width={400}
  height={300}
  loading="lazy"
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
  quality={75} // 모바일에서는 75%로 충분
/>
```

**적용 위치**:
- 매장 이미지
- 커뮤니티 글 이미지
- 프로필 이미지

---

### 7. **에러 바운더리 개선**

**난이도**: ⭐
**효과**: 앱 안정성 향상

```tsx
// 현재 ErrorBoundary 있음, 개선 가능
<ErrorBoundary
  fallback={
    <div className="p-safe text-center">
      <h2>문제가 발생했습니다</h2>
      <Button onClick={() => window.location.reload()}>
        새로고침
      </Button>
    </div>
  }
>
  {children}
</ErrorBoundary>
```

---

## 🤝 네이티브 협업이 필요한 것들

### 1. **네이티브 이미지 피커** ⭐⭐⭐ (중요)

**현재**: 웹 input file 사용
**개선**: 네이티브 카메라/갤러리 직접 접근

**장점**:
- 더 빠른 사진 선택
- 권한 관리 명확
- 네이티브 UI 사용

**웹 준비 완료**: `src/lib/webview.ts` - `postMessageToNative('PICK_IMAGE')`
**네이티브 구현 필요**: `WEBVIEW_INTEGRATION.md` 참고

---

### 2. **딥링크 (푸시 알림 → 특정 페이지)** ⭐⭐⭐ (중요)

**예시**:
- 푸시 알림 클릭 → 해당 게시글로 이동
- URL 공유 → 앱에서 열기

**웹 준비 완료**: `src/lib/webview.ts` - Deep Link 처리
**네이티브 구현 필요**: URL 스킴 정의 및 전달

---

### 3. **네이티브 공유 시트** ⭐⭐

**현재**: Web Share API (일부 브라우저만 지원)
**개선**: 네이티브 공유 UI

```tsx
// 웹에서 호출
postMessageToNative('SHARE', {
  title: '매장명',
  text: '설명',
  url: 'https://...'
});
```

**적용 위치**:
- 매장 공유하기
- 글 공유하기

---

### 4. **햅틱 피드백 (진동)** ⭐

**효과**: 버튼 클릭 시 촉각 피드백

```tsx
// 웹에서 호출
postMessageToNative('HAPTIC_FEEDBACK', {
  style: 'light' // 'medium', 'heavy'
});
```

**적용 위치**:
- 좋아요 버튼
- 예약 버튼
- 삭제 버튼

---

### 5. **상태바 스타일 제어** ⭐

**효과**: 페이지별 상태바 색상 변경

```tsx
// 웹에서 호출
postMessageToNative('SET_STATUS_BAR', {
  style: 'dark', // 'light'
  backgroundColor: '#FFFFFF'
});
```

---

### 6. **네이티브 뒤로가기 버튼** (이미 준비 완료)

**웹 준비 완료**: `src/hooks/useNativeBackButton.ts`
**네이티브 구현 필요**: Back 버튼 이벤트 전달

---

### 7. **앱 상태 변화 알림** (이미 준비 완료)

**웹 준비 완료**: WebSocket 라이프사이클 처리
**네이티브 구현 필요**: 앱 상태 (background/active) 전달

---

## 📊 우선순위 추천

### 🔥 높음 (즉시 가능 + 효과 큼)

1. **앱 아이콘 & 매니페스트** (30분)
2. **스켈레톤 로딩** (2시간)
3. **이미지 최적화** (1시간)
4. **Pull to Refresh** (3시간)

### ⭐ 중간 (네이티브 협업 필요하지만 중요)

5. **네이티브 이미지 피커** (네이티브 2시간 + 웹 1시간)
6. **딥링크** (네이티브 3시간 + 웹 1시간)
7. **네이티브 공유** (네이티브 1시간 + 웹 30분)

### 💡 낮음 (선택 사항)

8. **오프라인 지원** (1일)
9. **햅틱 피드백** (네이티브 1시간 + 웹 30분)
10. **상태바 제어** (네이티브 30분 + 웹 30분)

---

## 🎯 추천 작업 순서

### 1단계: 웹 단독 (오늘 바로 가능)
```
1. 앱 아이콘 & 매니페스트 생성
2. 스켈레톤 로딩 추가 (매장 목록, 커뮤니티)
3. 이미지 최적화 (Next.js Image quality 조정)
```

### 2단계: 네이티브 협업 (다음 주)
```
4. 네이티브 이미지 피커 연동
5. 딥링크 구현
6. 네이티브 공유 연동
```

### 3단계: 선택 사항 (여유 있을 때)
```
7. Pull to Refresh
8. 오프라인 지원
9. 햅틱 피드백
```

---

## ❓ 질문

다음 중 어떤 것을 먼저 진행하시겠습니까?

1. **앱 아이콘 & 매니페스트** (바로 가능, 30분)
2. **스켈레톤 로딩** (바로 가능, 2시간)
3. **Pull to Refresh** (바로 가능, 3시간)
4. **이미지 최적화** (바로 가능, 1시간)

또는 네이티브 개발팀과 협업하여:
5. **네이티브 이미지 피커** (효과 큼)
6. **딥링크** (푸시 알림에 필수)
