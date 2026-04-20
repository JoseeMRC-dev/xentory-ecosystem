/**
 * analytics — thin wrapper around GA4 gtag
 * Replace 'G-XXXXXXXXXX' in index.html with your real Measurement ID before going live.
 */

declare function gtag(...args: unknown[]): void;

function safeGtag(...args: unknown[]): void {
  try {
    if (typeof gtag === 'function') gtag(...args);
  } catch { /* noop */ }
}

/**
 * Track a GA4 event.
 * @param name  GA4 event name (snake_case recommended)
 * @param params Optional event parameters
 */
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  safeGtag('event', name, params ?? {});
}
