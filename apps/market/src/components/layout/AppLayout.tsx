import { useEffect, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '../../hooks/useAuth';

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
      <div
        className="mkt-content"
        style={{ marginLeft: 'var(--sidebar-w)', flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, width: 0 }}
      >
        <Topbar />
        {showAds && <AdBanner />}
        <main
          className="mkt-main"
          style={{
            marginTop: 'var(--topbar-h)',
            flex: 1,
            padding: '2rem',
            width: '100%',
            boxSizing: 'border-box',
            overflowX: 'hidden',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
