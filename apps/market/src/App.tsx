import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { AssetDetailPage } from './components/market/AssetDetailPage';
import { WatchlistPage, AlertsPage, AnalysisPage } from './components/market/MarketPages';
import { PlansPage } from './components/plans/PlansPage';
import { TelegramPage } from './components/telegram/TelegramPage';
import './styles/global.css';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { CurrencyProvider } from './context/CurrencyContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'Urbanist', fontWeight: 800, fontSize: '1.4rem', marginBottom: '1rem' }}>
          <span style={{ color: '#c9a84c' }}>Xentory</span>
          <span style={{ color: '#4d9fff', marginLeft: '0.1rem' }}>{'Market'}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
          {[0,1,2].map(i => (
            <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#c9a84c', display: 'inline-block', opacity: 0.6, animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />
          ))}
        </div>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
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
      <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />

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
  return (
    <ThemeProvider>
      <LanguageProvider>
      <CurrencyProvider>
      <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
      </CurrencyProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
