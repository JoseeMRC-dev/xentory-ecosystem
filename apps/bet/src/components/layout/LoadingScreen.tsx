import { useState, useEffect } from 'react';

interface LoadingScreenProps { onDone?: () => void; }

export function LoadingScreen({ onDone }: LoadingScreenProps) {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  // Read lang directly from storage — can't use context here (renders outside provider sometimes)
  const isEn = (() => { try { return localStorage.getItem('xentory_lang') === 'en'; } catch { return false; } })();

  useEffect(() => {
    const t = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => { setVisible(false); onDone?.(); }, 500);
    }, 2500);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <>
      <style>{`
        .bls-root { position:fixed;inset:0;width:100vw;height:100vh;height:100dvh;min-height:-webkit-fill-available;background:#050810;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;overflow:hidden;transition:opacity 0.5s ease; }
        .bls-glow { position:absolute;width:min(400px,80vw);height:min(400px,80vw);border-radius:50%;background:radial-gradient(circle, rgba(77,159,255,0.08) 0%, transparent 70%);animation:bls-glow-pulse 3s ease-in-out infinite;pointer-events:none; }
        .bls-logo { font-family:'Urbanist',sans-serif;font-weight:900;font-size:clamp(1.8rem,7vw,2.8rem);letter-spacing:-0.04em;margin-bottom:2.5rem;animation:bls-slide-up 0.6s ease both;position:relative;z-index:1; }
        .bls-spinner { position:relative;width:clamp(56px,12vw,72px);height:clamp(56px,12vw,72px);margin-bottom:2rem;animation:bls-slide-up 0.6s 0.1s ease both;opacity:0;animation-fill-mode:forwards;z-index:1; }
        .bls-ring-outer { position:absolute;inset:0;border-radius:50%;border:2px solid transparent;border-top-color:#4d9fff;border-right-color:rgba(77,159,255,0.3);animation:bls-spin 1.1s cubic-bezier(0.4,0,0.2,1) infinite; }
        .bls-ring-mid { position:absolute;inset:10px;border-radius:50%;border:2px solid transparent;border-top-color:#4d9fff;border-left-color:rgba(77,159,255,0.3);animation:bls-spin 0.75s cubic-bezier(0.4,0,0.2,1) infinite reverse; }
        .bls-dot { position:absolute;inset:22px;border-radius:50%;background:linear-gradient(135deg,#4d9fff,#1a6fff);animation:bls-dot-pulse 1.5s ease-in-out infinite; }
        .bls-label { color:#6b7294;font-size:clamp(0.62rem,2vw,0.78rem);letter-spacing:0.1em;text-transform:uppercase;animation:bls-slide-up 0.6s 0.2s ease both, bls-blink 2s 0.8s ease-in-out infinite;opacity:0;animation-fill-mode:forwards;z-index:1; }
        .bls-progress { position:absolute;bottom:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#4d9fff,#1a6fff);animation:bls-progress 2.5s linear both;transform-origin:left; }
        @keyframes bls-spin { to { transform:rotate(360deg); } }
        @keyframes bls-dot-pulse { 0%,100%{transform:scale(0.8);opacity:0.6;} 50%{transform:scale(1.2);opacity:1;} }
        @keyframes bls-glow-pulse { 0%,100%{transform:scale(1);opacity:0.5;} 50%{transform:scale(1.15);opacity:1;} }
        @keyframes bls-slide-up { from{opacity:0;transform:translateY(12px);} to{opacity:1;transform:translateY(0);} }
        @keyframes bls-blink { 0%,100%{opacity:0.4;} 50%{opacity:1;} }
        @keyframes bls-progress { from{transform:scaleX(0);} to{transform:scaleX(1);} }
      `}</style>
      <div className="bls-root" style={{ opacity: fadeOut ? 0 : 1, pointerEvents: fadeOut ? 'none' : 'all' }}>
        <div className="bls-glow" />
        <div className="bls-logo">
          <span style={{ background: 'linear-gradient(135deg, #c9a84c, #f0d060)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Xentory</span>
          <span style={{ color: '#4d9fff' }}>Bet</span>
        </div>
        <div className="bls-spinner">
          <div className="bls-ring-outer" />
          <div className="bls-ring-mid" />
          <div className="bls-dot" />
        </div>
        <p className="bls-label">{isEn ? 'Loading predictions…' : 'Cargando predicciones…'}</p>
        <div className="bls-progress" />
      </div>
    </>
  );
}
