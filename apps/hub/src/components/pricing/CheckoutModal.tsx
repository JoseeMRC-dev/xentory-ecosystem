import { useCallback, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '');

interface Props {
  clientSecret: string;
  onClose: () => void;
}

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const ShieldIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

export function CheckoutModal({ clientSecret, onClose }: Props) {
  const fetchClientSecret = useCallback(() => Promise.resolve(clientSecret), [clientSecret]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <>
      <style>{`
        @keyframes co-fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes co-popIn   {
          from { opacity: 0; transform: scale(0.94) }
          to   { opacity: 1; transform: scale(1) }
        }

        /* ── Overlay ── */
        .co-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(4, 6, 15, 0.82);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          animation: co-fadeIn 0.2s ease;
          /* flex centering — funciona correctamente en todos los tamaños */
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          /* scroll del overlay para pantallas muy pequeñas */
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        /* ── Popup ── */
        .co-popup {
          animation: co-popIn 0.25s cubic-bezier(0.34, 1.3, 0.64, 1);
          /* margin: auto centra correctamente dentro del flex overlay */
          margin: auto;
          flex-shrink: 0;

          background: var(--card);
          border: 1px solid var(--border2);
          border-radius: 20px;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255,255,255,0.04);
          display: flex;
          flex-direction: column;
          overflow: hidden;

          /* móvil: ocupa casi todo el ancho */
          width: 100%;
          max-width: 480px;
          max-height: calc(100dvh - 32px);
        }

        /* tablet */
        @media (min-width: 600px) {
          .co-overlay { padding: 32px; }
          .co-popup {
            max-width: 520px;
            max-height: calc(100dvh - 64px);
          }
        }

        /* desktop */
        @media (min-width: 1024px) {
          .co-overlay { padding: 40px; }
          .co-popup {
            max-width: 560px;
            max-height: calc(100dvh - 80px);
          }
        }

        /* ── Header ── */
        .co-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
          gap: 0.75rem;
        }

        .co-header-left {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 0;
        }

        .co-badge {
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          padding: 0.15rem 0.45rem;
          border-radius: 5px;
          background: rgba(0, 200, 122, 0.1);
          color: var(--green);
          border: 1px solid rgba(0, 200, 122, 0.22);
          white-space: nowrap;
          flex-shrink: 0;
        }

        .co-title {
          font-weight: 600;
          font-size: 0.88rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-family: system-ui, sans-serif;
        }

        .co-close-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid var(--border);
          background: var(--card2);
          cursor: pointer;
          color: var(--muted);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
          flex-shrink: 0;
        }
        .co-close-btn:hover {
          background: var(--border);
          color: var(--text);
          border-color: var(--border2);
        }

        /* ── Body scrollable ── */
        .co-body {
          overflow-y: auto;
          flex: 1;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }

        /* ── Footer ── */
        .co-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.6rem 1.25rem;
          border-top: 1px solid var(--border);
          flex-shrink: 0;
          color: var(--muted);
          font-size: 0.68rem;
          font-family: system-ui, sans-serif;
        }
      `}</style>

      <div
        className="co-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        role="dialog"
        aria-modal="true"
        aria-label="Pago seguro con Stripe"
      >
        <div className="co-popup">

          {/* Header */}
          <div className="co-header">
            <div className="co-header-left">
              <ShieldIcon />
              <span className="co-title">Pago seguro</span>
              <span className="co-badge">SSL 256-bit</span>
            </div>
            <button className="co-close-btn" onClick={onClose} aria-label="Cerrar">
              <CloseIcon />
            </button>
          </div>

          {/* Stripe Embedded Checkout */}
          <div className="co-body">
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ fetchClientSecret }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>

          {/* Footer */}
          <div className="co-footer">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Procesado por Stripe · Tus datos están protegidos
          </div>

        </div>
      </div>
    </>
  );
}
