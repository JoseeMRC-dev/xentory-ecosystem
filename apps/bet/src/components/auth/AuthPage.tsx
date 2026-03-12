import { useEffect } from 'react';
import { useLang } from '../../context/LanguageContext';

const HUB_URL = (import.meta as any).env?.VITE_HUB_URL ?? 'https://x-eight-beryl.vercel.app';

export function AuthPage() {
  const { t } = useLang();
  useEffect(() => {
    window.location.href = HUB_URL + '?redirect=bet';
  }, []);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.5rem', marginBottom: '1rem' }}>
          <span style={{ color: 'var(--gold)' }}>Xen</span><span style={{ color: 'var(--cyan)' }}>tory</span>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{t('Redirigiendo al login...', 'Redirecting to login...')}</p>
      </div>
    </div>
  );
}
