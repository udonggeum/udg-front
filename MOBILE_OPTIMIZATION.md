# 모바일/앱뷰 최적화 가이드

## 🎯 적용된 최적화 내용

앱으로 실행할 때 **모든 UI 요소**가 자동으로 최적화됩니다:
- ✅ 버튼
- ✅ 입력 필드
- ✅ 제목/매장명
- ✅ 태그/뱃지
- ✅ 가격 표시
- ✅ 카드/리스트 아이템
- ✅ 아이콘
- ✅ 텍스트 (모든 크기)

---

## 📱 자동 적용되는 최적화

### 1. **버튼 크기 최적화**

모바일에서 자동으로 적용됩니다:

```css
/* 작은 버튼 → 48px */
button.sm → min-height: 48px

/* 일반 버튼 → 52px */
button → min-height: 52px

/* 큰 버튼 → 56px */
button.lg → min-height: 56px
```

✅ **기존 웹**: 변화 없음
✅ **모바일/앱**: 터치하기 쉬운 크기로 자동 조정

### 2. **입력 필드 최적화**

```css
/* 모든 입력 필드 */
- 최소 높이: 48px
- 폰트 크기: 16px (iOS 자동 줌 방지)
- 터치 영역 충분
```

### 3. **Safe Area 자동 적용**

헤더와 하단 버튼에 Safe Area가 자동으로 적용됩니다:

```tsx
// 상단 헤더 - 노치 영역 회피
<header className="pt-safe">
  ...
</header>

// 하단 버튼 - 홈 인디케이터 영역 회피
<div className="pb-safe">
  <Button>확인</Button>
</div>
```

### 4. **텍스트 크기 자동 조정**

```
데스크톱 → 모바일
- body: 16px → 15px
- h1: 40px → 24px
- h2: 32px → 20px
- h3: 24px → 18px
- button: 15px → 14px (작은 화면)

작은 텍스트 자동 확대:
- 10px → 11px (알림 뱃지)
- 11px → 12px (태그, 레이블)
- 12px (text-xs) → 13px
- 13px (text-caption) → 14px
- 16px → 17px (매장명, 제목)
- 18px → 19px (페이지 제목)
```

### 5. **제목/매장명 최적화**

```css
/* 모바일에서 */
- 카드 제목: 16px (bold)
- 매장명: 17px
- 페이지 제목: 19px
- truncate → 2줄까지 표시 (줄바꿈 허용)
```

### 6. **태그/뱃지 최적화**

```css
/* 모바일에서 */
- 최소 높이: 24~28px
- 폰트 크기: 12px (bold)
- 패딩: 0.375rem 0.75rem
- 터치 영역 충분
```

### 7. **금거래 가격 표시 최적화**

> 커뮤니티 "금거래" 게시글에만 해당 (금 판매/구매 시 가격 표시)

```css
/* 모바일에서 */
- 가격 텍스트: 16px (bold)
- 가격 뱃지: 15px, 최소 높이 32px
- 잘 보이도록 대비 강화
```

### 8. **아이콘 크기 조정**

```css
모바일에서 아이콘 자동 확대:
- w-3 (12px) → 16px
- w-4 (16px) → 18px
- w-5 (20px) → 20px (유지)
- w-6 (24px) → 24px (유지)
- 터치 가능한 아이콘: 최소 20px
```

### 9. **카드/리스트 터치 영역**

```css
/* 모바일에서 */
- 일반 클릭 요소: 최소 68px
- 카드 아이템: 최소 80px
- 충분한 패딩: 1rem (16px)
- 간격 조정: 그리드 1rem, 리스트 0.875rem
```

### 5. **터치 영역 보장**

모든 클릭/탭 가능한 요소:
- 최소 크기: 44x44px (iOS 기준)
- 충분한 간격 자동 추가

---

## 🛠️ 사용 가능한 유틸리티 클래스

### Safe Area 관련

```tsx
// 상단 Safe Area 패딩
<div className="pt-safe">      // padding-top + safe area
<div className="pt-safe-sm">   // 작은 패딩 + safe area
<div className="pt-safe-lg">   // 큰 패딩 + safe area

// 하단 Safe Area 패딩
<div className="pb-safe">      // padding-bottom + safe area
<div className="pb-safe-sm">
<div className="pb-safe-lg">

// 좌우 Safe Area 패딩
<div className="px-safe">      // padding-left/right + safe area

// 전체 Safe Area 패딩
<div className="p-safe">       // 모든 방향 safe area
```

### 모바일 전용 표시/숨김

```tsx
// 모바일에서만 표시
<div className="mobile-only">
  모바일 전용 콘텐츠
</div>

// 모바일에서 숨김
<div className="mobile-hide">
  데스크톱 전용 콘텐츠
</div>
```

### 터치 영역 최적화

```tsx
// 터치 영역 최소 크기 보장
<button className="touch-target">
  탭하기
</button>
```

### 반응형 레이아웃

```tsx
// 모바일에서 세로 배치
<div className="flex stack-mobile">
  <Button>버튼 1</Button>
  <Button>버튼 2</Button>
</div>

// 모바일에서 전체 너비 버튼
<Button className="button-full-mobile">
  확인
</Button>

// 모바일에서 텍스트 말줄임
<p className="text-truncate-mobile">
  긴 텍스트...
</p>
```

### 하단 고정 버튼

```tsx
// Safe Area 자동 적용되는 하단 버튼
<div className="fixed-bottom-cta">
  <Button>구매하기</Button>
</div>
```

---

## 📐 화면 크기별 동작

### 큰 화면 (769px 이상 - 데스크톱/태블릿)
- 기존 웹 디자인 유지
- 최대 너비: 1200px
- 앱뷰에서는 600px로 제한 (모바일 앱처럼)

### 중간 화면 (431px ~ 768px - 일반 스마트폰)
- 버튼 최소 높이: 52px
- 폰트 크기: 15px
- 컨테이너 패딩: 16px

### 작은 화면 (376px ~ 430px - 작은 스마트폰)
- 여백 축소
- 버튼 패딩 조정
- 모달 전체 너비

### 아주 작은 화면 (375px 이하 - iPhone SE)
- 폰트 크기: 14px
- 입력 필드 패딩 축소
- 최적화된 레이아웃

---

## 🎨 앱뷰 전용 스타일

앱에서 실행 시 자동으로 적용되는 스타일:

```css
.is-webview {
  /* 버튼에 그림자 (네이티브처럼) */
  button { box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

  /* 터치 피드백 */
  button:active { transform: scale(0.98); }

  /* 입력 포커스 강화 */
  input:focus {
    border-color: #C9A227;
    box-shadow: 0 0 0 3px rgba(201,162,39,0.1);
  }

  /* 호버 효과 제거 (터치 환경) */
  .card:hover { transform: none; }
}
```

---

## 🚀 특별 최적화

### 1. **가로 모드 대응**
```css
/* 가로 모드에서 헤더 높이 축소 */
@media (orientation: landscape) and (max-height: 500px) {
  header { min-height: 48px; }
}
```

### 2. **터치 디바이스 감지**
```css
/* 터치만 가능한 디바이스 */
@media (hover: none) and (pointer: coarse) {
  /* 호버 효과 제거, active 효과 강화 */
  button:active { opacity: 0.7; }
}
```

### 3. **고해상도 디스플레이**
```css
/* Retina 디스플레이 */
@media (-webkit-min-device-pixel-ratio: 2) {
  /* 폰트 렌더링 최적화 */
  * { -webkit-font-smoothing: antialiased; }
}
```

---

## ✅ 체크리스트

### 새로운 컴포넌트 개발 시

- [ ] 버튼 최소 높이: 48px 이상
- [ ] 터치 영역: 44x44px 이상
- [ ] 텍스트 크기: 14px 이상 (본문 15px 권장)
- [ ] 입력 필드: 16px 이상 (iOS 줌 방지)
- [ ] 고정 너비/높이 대신 반응형 단위 사용
- [ ] Safe Area 고려 (`pt-safe`, `pb-safe` 사용)
- [ ] 모바일에서 텍스트 줄바꿈 확인
- [ ] 가로/세로 모드 모두 테스트

---

## 🐛 문제 해결

### 버튼이 너무 작아요
```tsx
// ❌ 나쁜 예
<button className="h-8">작은 버튼</button>

// ✅ 좋은 예
<button className="h-10">적당한 버튼</button>
// 또는
<button className="touch-target">터치 버튼</button>
```

### 텍스트가 잘려요
```tsx
// ❌ 나쁜 예
<p className="truncate">긴 텍스트...</p>

// ✅ 좋은 예 (모바일만)
<p className="text-truncate-mobile">긴 텍스트...</p>

// ✅ 좋은 예 (줄바꿈)
<p className="break-words">긴 텍스트...</p>
```

### 입력할 때 화면이 확대돼요 (iOS)
```tsx
// ❌ 나쁜 예
<input style={{ fontSize: '14px' }} />

// ✅ 좋은 예
<input style={{ fontSize: '16px' }} />
// 또는 클래스 사용 (자동 적용됨)
<input className="..." />
```

### 하단 버튼이 홈 인디케이터에 가려져요
```tsx
// ❌ 나쁜 예
<div className="fixed bottom-0">
  <Button>확인</Button>
</div>

// ✅ 좋은 예
<div className="fixed-bottom-cta">
  <Button>확인</Button>
</div>
// 또는
<div className="fixed bottom-0 pb-safe">
  <Button>확인</Button>
</div>
```

---

## 📊 테스트 기기 권장 사항

### 필수 테스트 해상도

1. **iPhone SE (375x667)** - 작은 화면
2. **iPhone 12/13/14 (390x844)** - 일반 화면
3. **iPhone 14 Pro Max (430x932)** - 큰 화면
4. **Galaxy S21 (360x800)** - Android 표준
5. **iPad (768x1024)** - 태블릿

### 브라우저 개발자 도구로 테스트

```
Chrome DevTools:
1. F12 → Toggle Device Toolbar (Cmd/Ctrl + Shift + M)
2. 디바이스 선택 또는 커스텀 크기 입력
3. Safe Area 시뮬레이션: iPhone X/11/12 선택
```

---

## 💡 팁

1. **고정 크기 피하기**: `width: 300px` 대신 `max-width: 100%` 사용
2. **상대 단위 사용**: `px` 대신 `rem`, `em`, `%` 사용
3. **flexbox/grid 활용**: 반응형 레이아웃에 최적
4. **이미지 최적화**: `width: 100%; height: auto;`
5. **Safe Area 우선**: 헤더/푸터는 항상 Safe Area 고려

---

## 🎉 자동으로 처리되는 것들

걱정하지 마세요! 다음은 이미 자동으로 처리됩니다:

✅ 모바일 화면 크기 감지
✅ 터치 영역 최소 크기 보장
✅ Safe Area 자동 적용 (iOS 노치/홈 인디케이터)
✅ 입력 필드 iOS 자동 줌 방지
✅ 버튼 크기 자동 조정
✅ 터치 피드백 효과
✅ 호버 효과 자동 제거 (터치 환경)
✅ 폰트 렌더링 최적화
✅ 웹뷰 환경 자동 감지

**기존 웹은 전혀 영향받지 않습니다!** 🎊
