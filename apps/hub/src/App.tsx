import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
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
    </>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
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
      <Route path="/login"       element={user ? <Navigate to="/dashboard" replace /> : <Layout hideFooter><AuthPage defaultTab="login" /></Layout>} />
      <Route path="/register"    element={user ? <Navigate to="/dashboard" replace /> : <Layout hideFooter><AuthPage defaultTab="register" /></Layout>} />
      <Route path="/dashboard"   element={<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>} />
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
      <ThemeProvider>
        <LanguageProvider>
          <CurrencyProvider>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </CurrencyProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
