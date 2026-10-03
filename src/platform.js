import { Capacitor } from '@capacitor/core';

export function isNativeApp() {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function isIosApp() {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
  } catch {
    return false;
  }
}

/**
 * Custom URL scheme that brings a magic link back into the iOS app.
 * Add this exact string under Supabase → Authentication → URL configuration → Redirect URLs.
 */
export const NATIVE_AUTH_REDIRECT = 'pepstep://auth/callback';

export function authRedirectUrl() {
  if (isNativeApp()) return NATIVE_AUTH_REDIRECT;
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}
