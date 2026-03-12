/**
 * Topbar — ticker sin microcortes.
 *
 * Arquitectura: el track animado es HTML estático (imperativo).
 * Los precios se parchean directo en el DOM vía refs — sin re-render React,
 * la animación CSS nunca se interrumpe.
 */
import { useEffect, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  subscribePrices, getLiveAssets, formatPrice, dataReady,
} from '../../services/marketService';
import type { Asset } from '../../types';

// ── SVG ICONS ──────────────────────────────────────────────────────
const BellIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);
const StarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

// ── STATIC HTML BUILDER ────────────────────────────────────────────
function buildTickerHTML(assets: Asset[]): string {
  const item = (a: Asset, clone: boolean) => `
    <span
      class="mkt-tk-item"
      ${clone ? 'aria-hidden="true"' : `data-id="${a.id}"`}
      style="display:inline-flex;align-items:center;gap:0.4rem;padding:0 1.6rem;cursor:pointer;font-size:0.78rem;border-right:1px solid rgba(255,255,255,0.06);flex-shrink:0;"
    >
      <span class="mkt-tk-sym" style="font-weight:600;color:var(--text2);letter-spacing:0.04em;font-family:'Outfit',sans-serif;">${a.symbol}</span>
      <span class="mkt-tk-price" style="color:var(--text);font-variant-numeric:tabular-nums;">${formatPrice(a.price, a.category)}</span>
      <span class="mkt-tk-pct ${a.changePercent24h >= 0 ? 'tk-up' : 'tk-dn'}" style="font-size:0.68rem;white-space:nowrap;">
        ${a.changePercent24h >= 0 ? '▲' : '▼'} ${Math.abs(a.changePercent24h).toFixed(2)}%
      </span>
    </span>`;
  return assets.map(a => item(a, false)).join('') +
         assets.map(a => item(a, true)).join('');
}

// ── TOPBAR ─────────────────────────────────────────────────────────
export const Topbar = memo(function Topbar() {
  const navigate  = useNavigate();
  const trackRef  = useRef<HTMLDivElement>(null);
  const assetsRef = useRef<Asset[]>([]);

  // Patch price/pct in DOM without touching animation
  const patchDOM = (assets: Asset[]) => {
    const track = trackRef.current;
    if (!track) return;
    assets.forEach(asset => {
      const el = track.querySelector<HTMLElement>(`[data-id="${asset.id}"]`);
      if (!el) return;
      const priceEl = el.querySelector<HTMLElement>('.mkt-tk-price');
      const pctEl   = el.querySelector<HTMLElement>('.mkt-tk-pct');
      if (!priceEl || !pctEl) return;

      const newPrice = formatPrice(asset.price, asset.category);
      const isUp     = asset.changePercent24h >= 0;
      const newPct   = `${isUp ? '▲' : '▼'} ${Math.abs(asset.changePercent24h).toFixed(2)}%`;

      // Flash on change
      if (priceEl.textContent !== newPrice) {
        priceEl.textContent = newPrice;
        priceEl.classList.remove('mkt-flash-up', 'mkt-flash-dn');
        void (priceEl as HTMLElement).offsetWidth; // reflow
        priceEl.classList.add(isUp ? 'mkt-flash-up' : 'mkt-flash-dn');
        setTimeout(() => priceEl.classList.remove('mkt-flash-up', 'mkt-flash-dn'), 600);
      }

      pctEl.textContent = newPct;
      pctEl.className = `mkt-tk-pct ${isUp ? 'tk-up' : 'tk-dn'}`;

      // Also patch clone (aria-hidden items — same order)
      const clones = track.querySelectorAll<HTMLElement>('[aria-hidden="true"]');
      const idx    = assets.indexOf(asset);
      const clone  = clones[idx];
      if (clone) {
        const cp = clone.querySelector<HTMLElement>('.mkt-tk-price');
        const cc = clone.querySelector<HTMLElement>('.mkt-tk-pct');
        if (cp) cp.textContent = newPrice;
        if (cc) { cc.textContent = newPct; cc.className = pctEl.className; }
      }
    });
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // Build static HTML once with initial mock data
    const initial = getLiveAssets();
    assetsRef.current = initial;
    track.innerHTML = buildTickerHTML(initial);

    // Click delegation
    const onClick = (e: MouseEvent) => {
      const item = (e.target as HTMLElement).closest<HTMLElement>('[data-id]');
      if (item) navigate(`/market/${item.dataset.id}`);
    };
    track.addEventListener('click', onClick);

    // Subscribe to price updates — patch DOM only, no re-render
    const unsub = subscribePrices(() => {
      const fresh = getLiveAssets();
      assetsRef.current = fresh;
      patchDOM(fresh);
    });

    // Load real prices
    dataReady.then(() => {
      const fresh = getLiveAssets();
      assetsRef.current = fresh;
      patchDOM(fresh);
    });

    return () => {
      unsub();
      track.removeEventListener('click', onClick);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <header className="mkt-topbar">
      {/* Fade masks */}
      <div className="mkt-tk-fade-left" />

      {/* Animated track */}
      <div className="mkt-tk-viewport">
        <div className="mkt-tk-track" ref={trackRef} />
      </div>

      <div className="mkt-tk-fade-right" />

      {/* Actions */}
      <div className="mkt-topbar-actions">
        <button
          onClick={() => navigate('/alerts')}
          className="mkt-topbar-icon-btn"
          title="Alertas"
        >
          <BellIcon />
          <span className="mkt-topbar-dot" />
        </button>
        <button
          onClick={() => navigate('/plans')}
          className="btn btn-gold btn-sm"
          style={{ gap: '0.3rem' }}
        >
          <StarIcon /> Pro
        </button>
      </div>

      <style>{`
        .mkt-topbar {
          position: fixed; top: 0;
          left: var(--sidebar-w); right: 0;
          height: var(--topbar-h);
          background: rgba(4,6,15,0.94);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          z-index: 40;
          display: flex; align-items: center; overflow: hidden;
        }
        .mkt-tk-viewport {
          flex: 1; overflow: hidden; position: relative;
        }
        .mkt-tk-track {
          display: flex;
          animation: mktTicker 20s linear infinite;
          will-change: transform;
          white-space: nowrap;
        }
        .mkt-tk-track:hover { animation-play-state: paused; }
        @keyframes mktTicker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .mkt-tk-fade-left {
          position: absolute; left: 0; top: 0; bottom: 0; width: 60px; z-index: 2;
          background: linear-gradient(90deg, rgba(4,6,15,0.95) 40%, transparent);
          pointer-events: none;
        }
        .mkt-tk-fade-right {
          position: relative; z-index: 2;
          width: 40px; flex-shrink: 0;
          background: linear-gradient(270deg, rgba(4,6,15,0.95) 40%, transparent);
          pointer-events: none;
          align-self: stretch;
        }
        .mkt-topbar-actions {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0 1rem; border-left: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0; z-index: 3;
        }
        .mkt-topbar-icon-btn {
          background: none; border: none; cursor: pointer;
          color: var(--muted); padding: 0.4rem; border-radius: 6;
          transition: color 0.2s; position: relative;
          display: flex; align-items: center; justify-content: center;
        }
        .mkt-topbar-icon-btn:hover { color: var(--text); }
        .mkt-topbar-dot {
          position: absolute; top: 3px; right: 3px;
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--gold); border: 1px solid var(--bg);
        }
        .tk-up  { color: var(--green); }
        .tk-dn  { color: var(--red); }
        @keyframes mktFlashUp { 0%,100%{color:inherit} 30%{color:var(--green)} }
        @keyframes mktFlashDn { 0%,100%{color:inherit} 30%{color:var(--red)} }
        .mkt-flash-up { animation: mktFlashUp 0.6s ease; }
        .mkt-flash-dn { animation: mktFlashDn 0.6s ease; }
        @media (max-width: 768px) {
          .mkt-topbar { left: 0 !important; top: 52px !important; }
        }
      `}</style>
    </header>
  );
});
