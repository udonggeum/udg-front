# 📱 우리동네금은방 - Capacitor 앱 가이드

## ✅ 완료된 작업

### 1. Capacitor 설치 및 초기화
- ✅ Capacitor Core & CLI 설치
- ✅ iOS/Android 프로젝트 생성
- ✅ 10개 필수 플러그인 설치

### 2. 설치된 플러그인
```
@capacitor/app                 - 앱 상태, 딥링크, 뒤로가기
@capacitor/splash-screen       - 스플래시 스크린
@capacitor/status-bar          - 상태바 제어
@capacitor/keyboard            - 키보드 제어
@capacitor/haptics             - 햅틱 피드백
@capacitor/network             - 네트워크 상태
@capacitor/share               - 공유하기
@capacitor/push-notifications  - 푸시 알림
@capacitor/camera              - 카메라/사진
@capacitor/geolocation         - 위치 서비스
```

### 3. 프로젝트 구조
```
프로젝트/
├── ios/              # iOS 네이티브 프로젝트 (Xcode)
├── android/          # Android 네이티브 프로젝트 (Android Studio)
├── out/              # 웹 빌드 출력 (Capacitor가 사용)
├── capacitor.config.ts  # Capacitor 설정
└── src/
    ├── lib/capacitor.ts           # Capacitor 유틸리티
    └── components/CapacitorInit.tsx  # 앱 초기화
```

### 4. 현재 설정
- **앱 ID**: com.udg.app
- **앱 이름**: 우리동네금은방
- **서버 연결**: http://localhost:5173 (개발 모드)
- **프로덕션**: 주석 처리됨 (배포 시 변경 필요)

---

## 🚀 다음 단계

### 개발 모드로 앱 실행

#### 1. Next.js 서버 시작
```bash
npm run dev
# → http://localhost:5173 실행 중
```

#### 2. Android 앱 실행 (다른 터미널)
```bash
npm run android
# → Android Studio가 열림
# → 에뮬레이터/실제 디바이스에서 실행
```

#### 3. iOS 앱 실행 (macOS 필요)
```bash
npm run ios
# → Xcode가 열림
# → 시뮬레이터/실제 디바이스에서 실행
```

---

## 📦 프로덕션 배포

### 1. 프로덕션 서버 URL 설정
```typescript
// capacitor.config.ts
server: {
  url: 'https://your-domain.com',  // 실제 도메인으로 변경
  cleartext: false,
}
```

### 2. 빌드 및 동기화
```bash
npm run build:mobile
# = npm run build && npx cap sync
```

### 3. 앱 빌드
```bash
# Android APK/AAB 생성
npm run android
# Android Studio에서 Build → Generate Signed Bundle/APK

# iOS IPA 생성
npm run ios
# Xcode에서 Product → Archive
```

---

## 🎨 앱 아이콘 & 스플래시 스크린

### 현재 상태
- ✅ PWA 아이콘 준비됨 (public/icon-*.png)
- ⚠️ 네이티브 앱 아이콘 미설정

### 설정 방법

#### 자동 생성 (권장)
```bash
# 1. 1024x1024 PNG 준비
# public/icon-1024x1024.png

# 2. Capacitor Asset Generator 사용
npx capacitor-assets generate --iconBackgroundColor '#C9A227' --iconBackgroundColorDark '#8A6A00'
```

#### 수동 설정
```bash
# iOS
ios/App/App/Assets.xcassets/AppIcon.appiconset/

# Android
android/app/src/main/res/mipmap-*/
```

---

## 🔧 유용한 명령어

```bash
# 플러그인 동기화
npm run cap:sync

# 플러그인 업데이트
npm run cap:update

# Android Studio 열기
npm run android

# Xcode 열기
npm run ios

# 빌드 + 동기화
npm run build:mobile

# 개발 서버
npm run dev
```

---

## 🐛 문제 해결

### "Unable to find next"
```bash
npm install
```

### Android 빌드 오류
```bash
cd android
./gradlew clean
cd ..
npx cap sync android
```

### iOS 빌드 오류 (macOS)
```bash
cd ios/App
pod install
cd ../..
npx cap sync ios
```

---

## 📱 테스트 방법

### 1. 웹 브라우저 (개발)
```bash
npm run dev
# → http://localhost:5173
```

### 2. Android 에뮬레이터
```bash
# Android Studio → AVD Manager → 에뮬레이터 실행
npm run android
```

### 3. iOS 시뮬레이터 (macOS)
```bash
npm run ios
# Xcode에서 시뮬레이터 선택 후 실행
```

### 4. 실제 디바이스
- Android: USB 디버깅 활성화
- iOS: Apple Developer 계정 필요

---

## 📖 추가 리소스

- [Capacitor 공식 문서](https://capacitorjs.com/docs)
- [Capacitor 플러그인](https://capacitorjs.com/docs/plugins)
- [iOS 앱 스토어 가이드](https://developer.apple.com/app-store/)
- [Google Play 가이드](https://play.google.com/console/about/)

---

## ⚙️ 환경 요구사항

### Android 빌드
- ✅ Node.js 18+
- ✅ Android Studio
- ✅ JDK 17+

### iOS 빌드 (macOS 전용)
- ✅ macOS
- ✅ Xcode 14+
- ✅ CocoaPods

---

## 🎯 체크리스트

### 배포 전 확인사항
- [ ] capacitor.config.ts에 프로덕션 URL 설정
- [ ] 앱 아이콘 설정 (1024x1024)
- [ ] 스플래시 스크린 설정
- [ ] Android: 서명 키 생성
- [ ] iOS: Apple Developer 계정
- [ ] 푸시 알림 인증서 (FCM, APNs)
- [ ] 개인정보 처리방침
- [ ] 이용약관
- [ ] 앱 스토어 스크린샷
- [ ] 앱 설명 작성

---

**현재 상태: 개발 환경 완료 ✅**
**다음 단계: 개발 모드 테스트 → 프로덕션 배포**
