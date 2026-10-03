import { isNativeApp } from './platform.js';
import { handleAuthCallbackUrl } from './cloud/sync.js';

/** Status bar and magic-link return. No-ops on the website. */
export async function initNative() {
  if (!isNativeApp()) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#0A2540' });
  } catch {
    /* The website build never reaches this. A missing plugin should not blank the app. */
  }

  try {
    const { App } = await import('@capacitor/app');
    App.addListener('appUrlOpen', (event) => {
      handleAuthCallbackUrl(event?.url);
    });
    const launch = await App.getLaunchUrl();
    if (launch?.url) await handleAuthCallbackUrl(launch.url);
  } catch {
    /* Deep links are iOS-only. */
  }
}
