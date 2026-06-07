import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import './styles/global.css';

const HomePage        = lazy(() => import('./components/home/HomePage'));
const MetodologiaPage = lazy(() => import('./components/home/MetodologiaPage').then(m => ({ default: m.MetodologiaPage })));
const AuthPage        = lazy(() => import('./components/auth/AuthPage').then(m => ({ default: m.AuthPage })));
const DashboardPage   = lazy(() => import('./components/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const PricingPage     = lazy(() => import('./components/pricing/PricingPage').then(m => ({ default: m.PricingPage })));
const BlogPage        = lazy(() => import('./components/blog/BlogPages').then(m => ({ default: m.BlogPage })));
const BlogPostPage    = lazy(() => import('./components/blog/BlogPages').then(m => ({ default: m.BlogPostPage })));
const AuthCallbackPage  = lazy(() => import('./components/auth/AuthCallbackPage').then(m => ({ default: m.AuthCallbackPage })));
const ResetPasswordPage = lazy(() => import('./components/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const TermsPage        = lazy(() => import('./components/legal/TermsPage').then(m => ({ default: m.TermsPage })));
const AlertsPage       = lazy(() => import('./components/alerts/AlertsPage').then(m => ({ default: m.AlertsPage })));
const StudioPage       = lazy(() => import('./components/studio/StudioPage').then(m => ({ default: m.StudioPage })));
const ChatWidget       = lazy(() => import('./components/chat/ChatWidget').then(m => ({ default: m.ChatWidget })));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <>
      <style>{`
        .xentory-back-top {
          position: fixed; bottom: 5.2rem; right: 1.5rem; z-index: 900;
          width: 44px; height: 44px; border-radius: 50%;
          background: var(--card); border: 1px solid var(--border2);
          color: var(--text2); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 16px rgba(0,0,0,0.18);
          transition: opacity 0.25s ease, transform 0.25s ease;
        }
        @media (min-width: 1024px) {
          .xentory-back-top { bottom: 5.8rem; right: 2rem; }
        }
      `}</style>
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Volver al inicio"
        className="xentory-back-top"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(12px)',
          pointerEvents: visible ? 'auto' : 'none',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </button>
    </>
  );
}

function PageSkeleton() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', display: 'inline-block', opacity: 0.5, animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </div>
    </div>
  );
}

function Layout({ children, hideFooter }: { children: React.ReactNode; hideFooter?: boolean }) {
  return (
    <>
      <Navbar />
      <main><Suspense fallback={<PageSkeleton />}>{children}</Suspense></main>
      {!hideFooter && <Footer />}
      <BackToTop />
      <Suspense fallback={null}><ChatWidget /></Suspense>
    </>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location  = useLocation();
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL?.trim().toLowerCase();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (adminEmail && user.email.toLowerCase() !== adminEmail) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/"            element={<Layout><HomePage /></Layout>} />
      <Route path="/pricing"     element={<Layout><PricingPage /></Layout>} />
      <Route path="/metodologia" element={<Layout><MetodologiaPage /></Layout>} />
      <Route path="/blog"        element={<Layout><BlogPage /></Layout>} />
      <Route path="/blog/:slug"  element={<Layout><BlogPostPage /></Layout>} />
      <Route path="/login"       element={user ? <Navigate to="/dashboard" replace /> : <Layout hideFooter><AuthPage key="login" defaultTab="login" /></Layout>} />
      <Route path="/register"    element={user ? <Navigate to="/dashboard" replace /> : <Layout hideFooter><AuthPage key="register" defaultTab="register" /></Layout>} />
      <Route path="/dashboard"   element={<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>} />
      <Route path="/alerts"      element={<ProtectedRoute><Layout><AlertsPage /></Layout></ProtectedRoute>} />
      <Route path="/studio"      element={<AdminRoute><Layout><StudioPage /></Layout></AdminRoute>} />
      <Route path="/auth/callback"   element={<AuthCallbackPage />} />
      <Route path="/reset-password"  element={<ResetPasswordPage />} />
      <Route path="/terminos"       element={<Layout><TermsPage /></Layout>} />
      <Route path="*"               element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ThemeProvider>
        <LanguageProvider>
          <CurrencyProvider>
            <PreferencesProvider>
              <AuthProvider>
                <AppRoutes />
              </AuthProvider>
            </PreferencesProvider>
          </CurrencyProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
