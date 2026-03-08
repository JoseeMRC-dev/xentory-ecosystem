/**
 * LoadingScreen — Xentory Bet
 * Forzado 3 segundos mínimo.
 * Para usar tu GIF: coloca el archivo en apps/bet/public/loading.gif
 * y descomenta el bloque <img> más abajo.
 */
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
      setTimeout(() => {
        setVisible(false);
        onDone?.();
      }, 500);
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#050810',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
      opacity: fadeOut ? 0 : 1,
      transition: 'opacity 0.5s ease',
      pointerEvents: fadeOut ? 'none' : 'all',
    }}>

      {/* Animated background glow */}
      <div style={{
        position: 'absolute', width: 400, height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,204,106,0.07) 0%, transparent 70%)',
        animation: 'glow-pulse 3s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <div style={{
        fontFamily: 'Urbanist, sans-serif',
        fontWeight: 900,
        fontSize: 'clamp(2rem, 6vw, 2.8rem)',
        letterSpacing: '-0.04em',
        marginBottom: '2.5rem',
        animation: 'fadeSlideUp 0.6s ease both',
      }}>
        <span style={{
          background: 'linear-gradient(135deg, #c9a84c, #f0d060)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>Xentory</span>
        <span style={{ color: '#4d9fff' }}>Bet</span>
      </div>

      {/* ── GIF aquí ── descomenta cuando tengas el archivo
      <img
        src="/loading.gif"
        alt=""
        style={{
          width: 120, height: 120,
          objectFit: 'contain',
          marginBottom: '2rem',
          animation: 'fadeSlideUp 0.6s 0.1s ease both',
        }}
      />
      */}

      {/* CSS fallback animation */}
      <div style={{
        position: 'relative', width: 72, height: 72,
        marginBottom: '2rem',
        animation: 'fadeSlideUp 0.6s 0.1s ease both',
        opacity: 0, animationFillMode: 'forwards',
      }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: '#00cc6a',
          borderRightColor: 'rgba(0,204,106,0.3)',
          animation: 'spin 1.1s cubic-bezier(0.4,0,0.2,1) infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 10, borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: '#4d9fff',
          borderLeftColor: 'rgba(77,159,255,0.3)',
          animation: 'spin 0.75s cubic-bezier(0.4,0,0.2,1) infinite reverse',
        }} />
        <div style={{
          position: 'absolute', inset: 22, borderRadius: '50%',
          background: 'linear-gradient(135deg, #00cc6a, #4d9fff)',
          animation: 'pulse-dot 1.5s ease-in-out infinite',
        }} />
      </div>

      <p style={{
        color: '#6b7294',
        fontSize: '0.78rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        animation: 'fadeSlideUp 0.6s 0.2s ease both, text-blink 2s 0.8s ease-in-out infinite',
        opacity: 0, animationFillMode: 'forwards',
      }}>
        Cargando predicciones…
      </p>

      {/* Progress bar — green for Bet */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 2,
        background: 'linear-gradient(90deg, #00cc6a, #4d9fff)',
        animation: 'progress-bar 3s linear both',
        transformOrigin: 'left',
      }} />

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-dot {
          0%, 100% { transform: scale(0.8); opacity: 0.6; }
          50%  { transform: scale(1.2); opacity: 1; }
        }
        @keyframes glow-pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes text-blink {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes progress-bar {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}
