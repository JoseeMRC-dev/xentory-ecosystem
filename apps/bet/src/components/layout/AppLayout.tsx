import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main className="bet-main" style={{ marginLeft: 'var(--sidebar-w)', flex: 1, padding: '2rem', overflowX: 'hidden' }}>
        {children}
      </main>
      <style>{`
        @media (max-width: 768px) {
          .bet-main { margin-left: 0 !important; padding-top: calc(52px + 1.5rem) !important; }
        }
      `}</style>
    </div>
  );
}
