import { useCallback, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '');

interface Props {
  clientSecret: string;
  onClose: () => void;
}

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export function CheckoutModal({ clientSecret, onClose }: Props) {
  const fetchClientSecret = useCallback(() => Promise.resolve(clientSecret), [clientSecret]);

  // Cerrar con Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    // Bloquear scroll del body mientras el modal está abierto
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
        @keyframes co-slideUp { from { transform: translateY(32px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }

        .co-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.78);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex;
          align-items: flex-end;          /* móvil: sheet desde abajo */
          justify-content: center;
          animation: co-fadeIn 0.18s ease;
          padding: 0;
        }

        .co-sheet {
          width: 100%;
          max-height: 96dvh;
          background: var(--card);
          border-radius: 20px 20px 0 0;
          border: 1px solid var(--border);
          border-bottom: none;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 -12px 60px rgba(0,0,0,0.45);
          animation: co-slideUp 0.25s cubic-bezier(0.34,1.2,0.64,1);
        }

        /* tablet/desktop: centrado como modal clásico */
        @media (min-width: 600px) {
          .co-overlay {
            align-items: center;
            padding: clamp(1rem, 4vw, 2rem);
          }
          .co-sheet {
            width: 100%;
            max-width: 540px;
            max-height: 92dvh;
            border-radius: 20px;
            border-bottom: 1px solid var(--border);
          }
        }

        /* pantallas muy pequeñas: full screen */
        @media (max-width: 380px) {
          .co-sheet {
            max-height: 100dvh;
            border-radius: 16px 16px 0 0;
          }
        }

        .co-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.9rem 1.1rem;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }

        .co-drag-handle {
          width: 36px; height: 4px;
          background: var(--border2);
          border-radius: 2px;
          margin: 0.6rem auto 0;
          flex-shrink: 0;
        }

        .co-body {
          overflow-y: auto;
          flex: 1;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }

        .co-close-btn {
          width: 34px; height: 34px;
          border-radius: 50%;
          border: none;
          background: var(--card2);
          cursor: pointer;
          color: var(--muted);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s, color 0.15s;
          flex-shrink: 0;
        }
        .co-close-btn:hover {
          background: var(--border);
          color: var(--text);
        }
      `}</style>

      <div
        className="co-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        role="dialog"
        aria-modal="true"
        aria-label="Pago seguro con Stripe"
      >
        <div className="co-sheet">
          {/* Handle visual (solo móvil, indica que se puede arrastrar) */}
          <div className="co-drag-handle" aria-hidden="true" />

          {/* Header */}
          <div className="co-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.9" strokeLinecap="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Pago seguro con Stripe</span>
              <span style={{
                fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.06em',
                padding: '0.1rem 0.4rem', borderRadius: 4,
                background: 'rgba(0,200,122,0.1)', color: 'var(--green)',
                border: '1px solid rgba(0,200,122,0.2)',
              }}>
                SSL 256-bit
              </span>
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
        </div>
      </div>
    </>
  );
}
