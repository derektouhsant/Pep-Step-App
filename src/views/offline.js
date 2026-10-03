export function renderOfflineBanner() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return `<div class="offline-banner" role="status">You're offline. PepStep still works with what's saved on this device. We'll sync again when you're back online.</div>`;
  }
  return '';
}
