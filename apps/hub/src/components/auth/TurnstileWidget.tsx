/**
 * TurnstileWidget — Cloudflare Turnstile CAPTCHA
 *
 * Setup:
 *   1. https://dash.cloudflare.com → Turnstile → Add Site
 *   2. Add to Vercel env vars:  VITE_TURNSTILE_SITE_KEY=0x4AAAAAAA...
 *   3. Add to Supabase secrets: TURNSTILE_SECRET_KEY=0x4AAAAAAA...
 *
 * Dev: uses test key "1x00000000000000000000AA" (always passes silently)
 *
 * Server-side verification (optional Edge Function):
 *   const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
 *     method: 'POST',
 *     body: JSON.stringify({ secret: TURNSTILE_SECRET_KEY, response: captchaToken }),
 *   });
 *   const { success } = await res.json();
 */

import { useState, useEffect, useRef, useId, useCallback } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: TurnstileRenderOptions) => string;
      reset:  (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileRenderOptions {
  sitekey:             string;
  callback:            (token: string) => void;
  'error-callback'?:   () => void;
  'expired-callback'?: () => void;
  theme?:              'light' | 'dark' | 'auto';
  size?:               'normal' | 'compact';
}

export interface TurnstileWidgetProps {
  onVerify:  (token: string) => void;
  onExpire?: () => void;
  onError?:  () => void;
  theme?:    'light' | 'dark' | 'auto';
  compact?:  boolean;
}

// Dev test key — always passes without showing a challenge
const DEV_TEST_KEY = '1x00000000000000000000AA';
const SITE_KEY = (import.meta as any).env?.VITE_TURNSTILE_SITE_KEY ?? DEV_TEST_KEY;

// Inject the Turnstile script tag once per page lifecycle
let scriptInjected = false;
function injectScript() {
  if (scriptInjected || document.getElementById('cf-turnstile-script')) {
    scriptInjected = true;
    return;
  }
  const script = document.createElement('script');
  script.id    = 'cf-turnstile-script';
  script.src   = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
  scriptInjected = true;
}

export function TurnstileWidget({
  onVerify, onExpire, onError,
  theme = 'dark', compact = false,
}: TurnstileWidgetProps) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const widgetIdRef   = useRef<string | null>(null);
  const renderedRef   = useRef(false);
  const uid           = useId().replace(/:/g, ''); // safe DOM id

  // Keep callback refs stable to avoid stale closures in the Turnstile callback
  const onVerifyRef  = useRef(onVerify);
  const onExpireRef  = useRef(onExpire);
  const onErrorRef   = useRef(onError);
  useEffect(() => { onVerifyRef.current  = onVerify;  }, [onVerify]);
  useEffect(() => { onExpireRef.current  = onExpire;  }, [onExpire]);
  useEffect(() => { onErrorRef.current   = onError;   }, [onError]);

  const resetWidget = useCallback(() => {
    if (widgetIdRef.current && window.turnstile) {
      try { window.turnstile.reset(widgetIdRef.current); } catch { /**/ }
    }
  }, []);

  useEffect(() => {
    injectScript();

    let pollId: ReturnType<typeof setInterval>;

    const tryRender = () => {
      if (renderedRef.current || !containerRef.current || !window.turnstile) return;
      renderedRef.current = true;

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey:             SITE_KEY,
        callback:            (token) => onVerifyRef.current(token),
        'error-callback':    () => {
          onErrorRef.current?.();
          // Auto-reset after a short delay so user can retry
          setTimeout(resetWidget, 1500);
        },
        'expired-callback':  () => {
          onExpireRef.current?.();
          resetWidget();
        },
        theme,
        size: compact ? 'compact' : 'normal',
      });
    };

    // Poll every 100ms until window.turnstile is ready (script loaded)
    pollId = setInterval(() => {
      if (window.turnstile) { clearInterval(pollId); tryRender(); }
    }, 100);

    // Timeout after 10s to avoid infinite poll
    const timeoutId = setTimeout(() => clearInterval(pollId), 10_000);

    return () => {
      clearInterval(pollId);
      clearTimeout(timeoutId);
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /**/ }
        widgetIdRef.current = null;
        renderedRef.current = false;
      }
    };
  }, []); // mount/unmount only

  return (
    <div
      ref={containerRef}
      id={`cf-turnstile-${uid}`}
      style={{ margin: '0.5rem 0', display: 'flex', justifyContent: 'center', minHeight: 65 }}
    />
  );
}

/** Hook: manages captcha token state in a parent component */
export function useCaptcha() {
  const [token,    setToken]    = useState('');
  const [resetKey, setResetKey] = useState(0);
  const onVerify = useCallback((t: string) => setToken(t), []);
  const onExpire = useCallback(() => setToken(''), []);
  const onError  = useCallback(() => setToken(''), []);
  // reset() clears the token AND increments resetKey so the caller can
  // pass it as `key` to <TurnstileWidget> — forcing a full remount.
  const reset    = useCallback(() => { setToken(''); setResetKey(k => k + 1); }, []);
  return { token, isVerified: token.length > 0, onVerify, onExpire, onError, reset, resetKey };
}
