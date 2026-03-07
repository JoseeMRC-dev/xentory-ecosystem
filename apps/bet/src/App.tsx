import { useEffect, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { MatchesPage } from './components/matches/MatchesPage';
import { MatchAnalysisPage, AnalysisPage } from './components/analysis/AnalysisPage';
import { PlansPage } from './components/plans/PlansPage';
import { TelegramPage, HistoryPage } from './components/telegram/TelegramPage';
import './styles/global.css';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';

const HUB_URL = (import.meta as any).env?.VITE_HUB_URL ?? 'https://x-eight-beryl.vercel.app';

// ProtectedRoute: waits for auth init, redirects to Hub (NOT /login)
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      window.location.href = HUB_URL;
    }
  }, [isLoading, user]);

  if (isLoading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'Urbanist', fontWeight: 800, fontSize: '1.4rem', marginBottom: '1rem' }}>
          <span style={{ color: '#c9a84c' }}>Xentory</span>
          <span style={{ color: '#4d9fff', marginLeft: '0.1rem' }}>Bet</span>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
          {[0,1,2].map(i => (
            <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#c9a84c', display: 'inline-block', opacity: 0.6, animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />
          ))}
        </div>
      </div>
    </div>
  );

  if (!user) return null;

  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/matches" element={<ProtectedRoute><MatchesPage /></ProtectedRoute>} />
      <Route path="/matches/:id" element={<ProtectedRoute><MatchAnalysisPage /></ProtectedRoute>} />
      <Route path="/analysis" element={<ProtectedRoute><AnalysisPage /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
      <Route path="/telegram" element={<ProtectedRoute><TelegramPage /></ProtectedRoute>} />
      <Route path="/plans" element={<ProtectedRoute><PlansPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
}
