import { Capacitor } from '@capacitor/core';

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export function isNativeIos() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

export async function initNativeShell() {
  if (!isNativeApp()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0A2540' });
  } catch {
    /* Status bar is unavailable outside the native shell. */
  }
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {
    /* Splash screen plugin hides itself after launch. */
  }
}
