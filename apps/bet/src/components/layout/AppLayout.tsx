import { useEffect, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { BetLiveTicker } from './BetLiveTicker';
import { useAuth } from '../../hooks/useAuth';

// topbar height for the live ticker
const TOPBAR_H = 36;

const ADSENSE_CLIENT = 'ca-pub-3599124999488513';

function AdBanner() {
  useEffect(() => {
    if (!document.getElementById('adsense-js')) {
      const script = document.createElement('script');
      script.id = 'adsense-js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
      document.head.appendChild(script);
    }
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch { /**/ }
  }, []);

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block' }}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const showAds = !user || user.plan === 'free';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', overflowX: 'hidden' }}>
      <Sidebar />
      <div className="bet-content-wrapper" style={{ marginLeft: 'var(--sidebar-w)', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', width: 0 }}>
        <BetLiveTicker />
        {showAds && (
          <div style={{ paddingTop: TOPBAR_H }}>
            <AdBanner />
          </div>
        )}
        <main
          className="bet-main"
          style={{
            flex: 1,
            padding: '2rem',
            paddingTop: `calc(${TOPBAR_H}px + 2rem)`,
            width: '100%',
            boxSizing: 'border-box',
            overflowX: 'hidden',
          }}
        >
          {children}
        </main>
      </div>

      <style>{`
        :root { --topbar-h: ${TOPBAR_H}px; }
        @media (max-width: 768px) {
          :root { --sidebar-w: 0px; }
          .bet-main { padding-top: calc(52px + ${TOPBAR_H}px + 1rem) !important; }
        }
      `}</style>
    </div>
  );
}
