import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { BetLiveTicker } from './BetLiveTicker';

// topbar height for the live ticker
const TOPBAR_H = 36;

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', overflowX: 'hidden' }}>
      <Sidebar />
      <div style={{ marginLeft: 'var(--sidebar-w)', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <BetLiveTicker />
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
          .bet-main { padding-top: calc(${TOPBAR_H}px + 1.2rem) !important; }
        }
      `}</style>
    </div>
  );
}
