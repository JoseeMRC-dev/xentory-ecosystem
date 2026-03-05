/**
 * LiveTicker v8 — arquitectura imperativa pura
 *
 * En lugar de asignar refs individuales a cada <span> y contar cuántos
 * llegaron, montamos el HTML del ticker de forma imperativa en un
 * contenedor, obtenemos los elementos con querySelectorAll, y lanzamos
 * el engine. Cero problemas de StrictMode, cero contadores, cero hoisting.
 */

import { useEffect, useRef, memo, type MutableRefObject } from 'react';
import { useCurrency } from '../../context/CurrencyContext';

const CRYPTO = [
  { sym: 'BTC',  bin: 'BTCUSDT',  pre: '$', dec: 0 },
  { sym: 'ETH',  bin: 'ETHUSDT',  pre: '$', dec: 2 },
  { sym: 'SOL',  bin: 'SOLUSDT',  pre: '$', dec: 2 },
  { sym: 'XRP',  bin: 'XRPUSDT',  pre: '$', dec: 4 },
  { sym: 'BNB',  bin: 'BNBUSDT',  pre: '$', dec: 2 },
  { sym: 'DOGE', bin: 'DOGEUSDT', pre: '$', dec: 5 },
  { sym: 'AVAX', bin: 'AVAXUSDT', pre: '$', dec: 2 },
  { sym: 'ADA',  bin: 'ADAUSDT',  pre: '$', dec: 5 },
] as const;

const FOREX = [
  { sym: 'EUR/USD', dec: 4, pre: '' },
  { sym: 'GBP/USD', dec: 4, pre: '' },
] as const;

const ALL = [
  ...CRYPTO.map(c => ({ sym: c.sym, dec: c.dec, pre: c.pre, crypto: true  })),
  ...FOREX .map(f => ({ sym: f.sym, dec: f.dec, pre: f.pre, crypto: false })),
];
const N = ALL.length;

const BIN_IDX: Record<string, number> = {};
CRYPTO.forEach((c, i) => { BIN_IDX[c.bin] = i; });

function fmt(val: number, dec: number, pre: string) {
  return pre + (dec === 0 ? Math.round(val).toLocaleString('en-US') : val.toFixed(dec));
}

// Build static HTML for ticker rows (called once)
function buildHTML() {
  const item = (sym: string, clone: boolean) => `
    <span class="tk-item" ${clone ? 'aria-hidden="true"' : `data-sym="${sym}"`}>
      <span class="tk-sym">${sym}</span>
      <span class="tk-price">—</span>
      <span class="tk-arr tk-up" style="font-size:0.6rem">▲</span>
      <span class="tk-pct tk-up">—</span>
    </span>`;
  return ALL.map(s => item(s.sym, false)).join('') +
         ALL.map(s => item(s.sym, true)).join('');
}

function runEngine(
  track: HTMLElement,
  curRef: MutableRefObject<{ currency: string; rate: number }>,
): () => void {
  // Query real (non-clone) price/pct/arr elements by index
  const items = Array.from(track.querySelectorAll<HTMLElement>('[data-sym]'));
  const priceEls = items.map(el => el.querySelector<HTMLElement>('.tk-price')!);
  const arrEls   = items.map(el => el.querySelector<HTMLElement>('.tk-arr')!);
  const pctEls   = items.map(el => el.querySelector<HTMLElement>('.tk-pct')!);

  const prices = new Float64Array(N);
  const opens  = new Float64Array(N);

  const patch = (idx: number, price: number, open: number) => {
    if (!Number.isFinite(price) || idx < 0 || idx >= N) return;
    const prev  = prices[idx];
    prices[idx] = price;
    if (open > 0) opens[idx] = open;
    const openRef = opens[idx] > 0 ? opens[idx] : price;
    const pct = openRef > 0 ? ((price - openRef) / openRef) * 100 : 0;
    const up  = prev > 0 ? price >= prev : pct >= 0;
    const cfg = ALL[idx];

    const pe = priceEls[idx], ce = pctEls[idx], ae = arrEls[idx];
    if (!pe || !ce || !ae) return;

    const { currency, rate } = curRef.current;
    const conv = currency === 'EUR' && cfg.crypto;
    pe.textContent = fmt(conv ? price * rate : price, cfg.dec, conv ? '€' : cfg.pre);
    ce.textContent = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
    ae.textContent = up ? '▲' : '▼';
    ce.className = `tk-pct ${up ? 'tk-up' : 'tk-dn'}`;
    ae.className = `tk-arr ${up ? 'tk-up' : 'tk-dn'}`;

    if (prev > 0 && price !== prev) {
      const fc = up ? 'tk-flash-up' : 'tk-flash-dn';
      pe.classList.remove('tk-flash-up', 'tk-flash-dn');
      void pe.offsetWidth;
      pe.classList.add(fc);
      setTimeout(() => pe.classList.remove('tk-flash-up', 'tk-flash-dn'), 700);
    }

    // Also update the clone element (same index in second half)
    const cloneItems = Array.from(track.querySelectorAll<HTMLElement>('[aria-hidden="true"]'));
    const clonePrice = cloneItems[idx]?.querySelector<HTMLElement>('.tk-price');
    const clonePct   = cloneItems[idx]?.querySelector<HTMLElement>('.tk-pct');
    const cloneArr   = cloneItems[idx]?.querySelector<HTMLElement>('.tk-arr');
    if (clonePrice) clonePrice.textContent = pe.textContent;
    if (clonePct)   { clonePct.textContent = ce.textContent; clonePct.className = ce.className; }
    if (cloneArr)   { cloneArr.textContent = ae.textContent; cloneArr.className = ae.className; }
  };

  let dead = false;

  // 1. Binance REST snapshot
  const syms = JSON.stringify(CRYPTO.map(c => c.bin));
  fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(syms)}`)
    .then(r => r.json())
    .then((rows: { symbol: string; lastPrice: string; openPrice: string }[]) => {
      if (dead) return;
      rows.forEach(r => {
        const idx = BIN_IDX[r.symbol];
        if (idx !== undefined) patch(idx, +r.lastPrice, +r.openPrice);
      });
    })
    .catch(() => {});

  // 2. Frankfurter forex
  const FX = CRYPTO.length;
  const pollFx = () => {
    if (dead) return;
    fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,GBP')
      .then(r => r.json())
      .then((d: { rates: { USD: number; GBP: number } }) => {
        if (dead) return;
        const { USD: usd, GBP: gbp } = d.rates ?? {};
        if (usd)        patch(FX,     usd,       opens[FX]     || usd);
        if (usd && gbp) patch(FX + 1, usd / gbp, opens[FX + 1] || usd / gbp);
      })
      .catch(() => {});
  };
  pollFx();
  const fxTimer = setInterval(pollFx, 60_000);

  // 3. Binance WebSocket
  const streams = CRYPTO.map(c => `${c.bin.toLowerCase()}@miniTicker`).join('/');
  const pending = new Map<number, { p: number; o: number }>();
  let rafId = 0, ws: WebSocket | null = null, retryT: ReturnType<typeof setTimeout> | null = null;

  const flush = () => { pending.forEach(({ p, o }, i) => patch(i, p, o)); pending.clear(); };

  const connect = () => {
    if (dead) return;
    ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
    ws.onmessage = (e: MessageEvent<string>) => {
      if (!e.data.includes('miniTicker')) return;
      try {
        const d = JSON.parse(e.data)?.data;
        if (d?.e !== '24hrMiniTicker') return;
        const idx = BIN_IDX[d.s];
        if (idx === undefined) return;
        pending.set(idx, { p: +d.c, o: +d.o });
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(flush);
      } catch { /**/ }
    };
    ws.onerror = () => { ws?.close(); if (!dead) retryT = setTimeout(connect, 5000); };
    ws.onclose = () => {               if (!dead) retryT = setTimeout(connect, 5000); };
  };
  connect();

  return () => {
    dead = true;
    clearInterval(fxTimer);
    cancelAnimationFrame(rafId);
    if (retryT) clearTimeout(retryT);
    ws?.close();
  };
}

export const LiveTicker = memo(() => {
  const { currency, rate } = useCurrency();
  const curRef   = useRef({ currency, rate });
  curRef.current = { currency, rate };

  const trackRef   = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // Build static HTML once
    track.innerHTML = buildHTML();

    // Start engine
    cleanupRef.current = runEngine(track, curRef);

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="ticker-wrap">
      <div className="ticker-badge">
        <span className="ticker-dot" />
        <span className="ticker-label">en vivo</span>
      </div>
      <div className="ticker-mask">
        <div className="ticker-track" ref={trackRef} />
      </div>
    </div>
  );
});
