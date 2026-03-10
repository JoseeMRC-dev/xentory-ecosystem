import { useState, useEffect } from 'react';

interface LoadingScreenProps {
  onDone?: () => void;
}

export function LoadingScreen({ onDone }: LoadingScreenProps) {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => { setVisible(false); onDone?.(); }, 500);
    }, 2500); // reduced from 3000ms
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <>
      <style>{`
        .xls-root {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          height: 100dvh;
          min-height: -webkit-fill-available;
          background: #050810;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          overflow: hidden;
          transition: opacity 0.5s ease;
        }
        .xls-glow {
          position: absolute;
          width: min(400px, 80vw);
          height: min(400px, 80vw);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%);
          animation: xls-glow-pulse 3s ease-in-out infinite;
          pointer-events: none;
        }
        .xls-logo {
          font-family: 'Urbanist', sans-serif;
          font-weight: 900;
          font-size: clamp(1.8rem, 7vw, 2.8rem);
          letter-spacing: -0.04em;
          margin-bottom: 2.5rem;
          animation: xls-slide-up 0.6s ease both;
          position: relative;
          z-index: 1;
        }
        .xls-spinner {
          position: relative;
          width: clamp(56px, 12vw, 72px);
          height: clamp(56px, 12vw, 72px);
          margin-bottom: 2rem;
          animation: xls-slide-up 0.6s 0.1s ease both;
          opacity: 0;
          animation-fill-mode: forwards;
          z-index: 1;
        }
        .xls-ring-outer {
          position: absolute; inset: 0; border-radius: 50%;
          border: 2px solid transparent;
          border-top-color: #c9a84c;
          border-right-color: rgba(201,168,76,0.3);
          animation: xls-spin 1.1s cubic-bezier(0.4,0,0.2,1) infinite;
        }
        .xls-ring-mid {
          position: absolute; inset: 10px; border-radius: 50%;
          border: 2px solid transparent;
          border-top-color: #4d9fff;
          border-left-color: rgba(77,159,255,0.3);
          animation: xls-spin 0.75s cubic-bezier(0.4,0,0.2,1) infinite reverse;
        }
        .xls-dot {
          position: absolute; inset: 22px; border-radius: 50%;
          background: linear-gradient(135deg, #c9a84c, #4d9fff);
          animation: xls-dot-pulse 1.5s ease-in-out infinite;
        }
        .xls-label {
          color: #6b7294;
          font-size: clamp(0.62rem, 2vw, 0.78rem);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          animation: xls-slide-up 0.6s 0.2s ease both, xls-blink 2s 0.8s ease-in-out infinite;
          opacity: 0;
          animation-fill-mode: forwards;
          z-index: 1;
        }
        .xls-progress {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, #c9a84c, #4d9fff);
          animation: xls-progress 2.5s linear both;
          transform-origin: left;
        }
        @keyframes xls-spin { to { transform: rotate(360deg); } }
        @keyframes xls-dot-pulse {
          0%, 100% { transform: scale(0.8); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        @keyframes xls-glow-pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes xls-slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes xls-blink {
          0%, 100% { opacity: 0.4; } 50% { opacity: 1; }
        }
        @keyframes xls-progress {
          from { transform: scaleX(0); } to { transform: scaleX(1); }
        }
      `}</style>
      <div
        className="xls-root"
        style={{ opacity: fadeOut ? 0 : 1, pointerEvents: fadeOut ? 'none' : 'all' }}
      >
        <div className="xls-glow" />

        <div className="xls-logo">
          <span style={{
            background: 'linear-gradient(135deg, #c9a84c, #f0d060)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Xentory</span>
          <span style={{ color: '#4d9fff' }}>Market</span>
        </div>

        <div className="xls-spinner">
          <div className="xls-ring-outer" />
          <div className="xls-ring-mid" />
          <div className="xls-dot" />
        </div>

        <p className="xls-label">Loading market data…</p>
        <div className="xls-progress" />
      </div>
    </>
  );
}
