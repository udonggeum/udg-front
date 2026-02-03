/**
 * Capacitor 플러그인 초기화 및 유틸리티
 */
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Network } from '@capacitor/network';

// Capacitor 환경인지 확인
export const isNativePlatform = () => {
  return Capacitor.isNativePlatform();
};

// 플랫폼 확인
export const getPlatform = () => {
  return Capacitor.getPlatform(); // 'ios', 'android', 'web'
};

// 앱 초기화
export const initializeApp = async () => {
  if (!isNativePlatform()) {
    console.log('[Capacitor] Running in web mode');
    return;
  }

  console.log(`[Capacitor] Initializing on ${getPlatform()}`);

  try {
    // 상태바 설정
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#C9A227' });

    // 스플래시 스크린 숨기기
    await SplashScreen.hide();

    // 키보드 설정
    Keyboard.setAccessoryBarVisible({ isVisible: true });

    // 네트워크 상태 모니터링
    Network.addListener('networkStatusChange', (status) => {
      console.log('[Capacitor] Network status changed:', status);
    });

    // 앱 상태 변경 리스너
    App.addListener('appStateChange', ({ isActive }) => {
      console.log('[Capacitor] App state changed. Active:', isActive);
    });

    // 뒤로가기 버튼 리스너 (Android)
    App.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        App.exitApp();
      } else {
        window.history.back();
      }
    });

    console.log('[Capacitor] Initialization complete');
  } catch (error) {
    console.error('[Capacitor] Initialization error:', error);
  }
};

// 햅틱 피드백
export const hapticImpact = async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
  if (!isNativePlatform()) return;

  try {
    const styleMap = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };

    await Haptics.impact({ style: styleMap[style] });
  } catch (error) {
    console.error('[Capacitor] Haptic feedback error:', error);
  }
};

// 네트워크 상태 확인
export const checkNetworkStatus = async () => {
  try {
    const status = await Network.getStatus();
    return status.connected;
  } catch (error) {
    console.error('[Capacitor] Network status check error:', error);
    return true; // 에러 시 연결된 것으로 가정
  }
};

// 앱 정보 가져오기
export const getAppInfo = async () => {
  if (!isNativePlatform()) return null;

  try {
    const info = await App.getInfo();
    return info;
  } catch (error) {
    console.error('[Capacitor] Get app info error:', error);
    return null;
  }
};
