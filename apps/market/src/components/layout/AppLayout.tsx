import { type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div className="mkt-content" style={{ marginLeft: 'var(--sidebar-w)', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Topbar />
        <main style={{ marginTop: 'var(--topbar-h)', flex: 1, padding: '2rem', maxWidth: '100%', overflowX: 'hidden' }}>
          {children}
        </main>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .mkt-content { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  );
}
