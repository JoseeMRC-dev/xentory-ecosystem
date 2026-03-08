/**
 * LoadingScreen — Xentory Market
 * Shows a GIF if placed at /public/loading.gif, else falls back to animated CSS.
 * To use your own GIF: put it at apps/market/public/loading.gif
 */
export function LoadingScreen() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#050810',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }}>
      {/* Logo */}
      <div style={{
        fontFamily: 'Urbanist, sans-serif',
        fontWeight: 900,
        fontSize: 'clamp(1.8rem, 5vw, 2.4rem)',
        letterSpacing: '-0.03em',
        marginBottom: '2rem',
      }}>
        <span style={{ background: 'linear-gradient(135deg, #c9a84c, #f0d060)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Xentory
        </span>
        <span style={{ color: '#4d9fff' }}>Market</span>
      </div>

      {/* GIF container — replace src with your own gif */}
      <div style={{ position: 'relative', width: 80, height: 80, marginBottom: '1.5rem' }}>
        {/* Fallback CSS animation — hidden if GIF loads */}
        <div className="loading-ring" />
        <div className="loading-ring loading-ring-2" />
        {/* Uncomment when you have a gif:
        <img
          src="/loading.gif"
          alt="Cargando..."
          style={{ width: 80, height: 80, objectFit: 'contain', position: 'absolute', inset: 0 }}
        />
        */}
      </div>

      <p style={{
        color: '#6b7294',
        fontSize: '0.85rem',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}>
        Cargando datos del mercado…
      </p>

      <style>{`
        .loading-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid transparent;
          border-top-color: #c9a84c;
          animation: spin 1s linear infinite;
        }
        .loading-ring-2 {
          inset: 8px;
          border-top-color: #4d9fff;
          animation-duration: 0.7s;
          animation-direction: reverse;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
      `}</style>
    </div>
  );
}
