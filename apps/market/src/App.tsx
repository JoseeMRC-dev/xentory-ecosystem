import { useState, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { AssetDetailPage } from './components/market/AssetDetailPage';
import { WatchlistPage, AlertsPage, AnalysisPage } from './components/market/MarketPages';
import { PlansPage } from './components/plans/PlansPage';
import { TelegramPage } from './components/telegram/TelegramPage';
import './styles/global.css';
import { LoadingScreen } from './components/layout/LoadingScreen';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { CurrencyProvider } from './context/CurrencyContext';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) {
    // Redirect to Hub instead of /login — preserves clean flow
    const HUB = (import.meta as any).env?.VITE_HUB_URL ?? 'https://x-eight-beryl.vercel.app';
    window.location.href = HUB;
    return null;
  }
  return <AppLayout>{children}</AppLayout>;
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
      <Route path="/login" element={<RedirectToHub />} />
      <Route path="/" element={
        // If SSO params present, go to dashboard (AuthProvider will handle them)
        window.location.search.includes('uid=')
          ? <Navigate to={"/dashboard" + window.location.search} replace />
          : <Navigate to={user ? "/dashboard" : "/login"} replace />
      } />

      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/market" element={<ProtectedRoute><AnalysisPage /></ProtectedRoute>} />
      <Route path="/market/:id" element={<ProtectedRoute><AssetDetailPage /></ProtectedRoute>} />
      <Route path="/watchlist" element={<ProtectedRoute><WatchlistPage /></ProtectedRoute>} />
      <Route path="/analysis" element={<ProtectedRoute><AnalysisPage /></ProtectedRoute>} />
      <Route path="/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
      <Route path="/telegram" element={<ProtectedRoute><TelegramPage /></ProtectedRoute>} />
      <Route path="/plans" element={<ProtectedRoute><PlansPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const [appReady, setAppReady] = useState(false);

  return (
    <ThemeProvider>
      <LanguageProvider>
      <CurrencyProvider>
        {!appReady && <LoadingScreen onDone={() => setAppReady(true)} />}
        {appReady && (
          <BrowserRouter>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </BrowserRouter>
        )}
      </CurrencyProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
