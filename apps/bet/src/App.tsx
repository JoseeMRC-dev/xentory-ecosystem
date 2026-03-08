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
import { LoadingScreen } from './components/layout/LoadingScreen';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) {
    const HUB = (import.meta as any).env?.VITE_HUB_URL ?? 'https://x-eight-beryl.vercel.app';
    window.location.href = HUB;
    return null;
  }
  return <>{children}</>;
}


function RedirectToHub() {
  const HUB = (import.meta as any).env?.VITE_HUB_URL ?? 'https://x-eight-beryl.vercel.app';
  useEffect(() => { window.location.href = HUB; }, []);
  return null;
}
function AppRoutes() {
  const { user, isLoading } = useAuth();

  return (
    <Routes>
      {/* Toda autenticación ocurre en Xentory */}
      <Route path="/login" element={<RedirectToHub />} />

      {/* Rutas protegidas */}
      <Route path="/" element={
        window.location.search.includes('uid=')
          ? <ProtectedRoute><AppLayout><Navigate to={"/dashboard" + window.location.search} replace /></AppLayout></ProtectedRoute>
          : <ProtectedRoute><AppLayout><Navigate to="/dashboard" replace /></AppLayout></ProtectedRoute>
      } />
      <Route path="/dashboard" element={<ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>} />
      <Route path="/matches" element={<ProtectedRoute><AppLayout><MatchesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/matches/:id" element={<ProtectedRoute><AppLayout><MatchAnalysisPage /></AppLayout></ProtectedRoute>} />
      <Route path="/analysis" element={<ProtectedRoute><AppLayout><AnalysisPage /></AppLayout></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><AppLayout><HistoryPage /></AppLayout></ProtectedRoute>} />
      <Route path="/telegram" element={<ProtectedRoute><AppLayout><TelegramPage /></AppLayout></ProtectedRoute>} />
      <Route path="/plans" element={<ProtectedRoute><AppLayout><PlansPage /></AppLayout></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
