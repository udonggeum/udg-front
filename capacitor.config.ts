import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.udg.app',
  appName: '우리동네금은방',
  webDir: 'out',
  server: {
    // 개발 모드: 로컬 Next.js 서버 연결
    url: 'http://localhost:5173',
    cleartext: true, // HTTP 허용 (개발용)

    // 프로덕션 배포 시 주석 해제하고 실제 도메인으로 변경
    // url: 'https://your-production-domain.com',
    // cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#FFFFFF',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
      spinnerColor: '#C9A227',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      resize: 'native',
      style: 'light',
      resizeOnFullScreen: true,
    },
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'App',
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'APK',
    },
  },
};

export default config;
