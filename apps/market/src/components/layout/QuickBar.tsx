import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LanguageContext';

const HUB_URL = 'http://localhost:4000'; // change to prod URL when deploying

const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <circle cx="12" cy="12" r="4.5"/>
    <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
    <line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
    <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
    <line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/>
  </svg>
);
const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const HomeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
    <path d="M9 21V12h6v9"/>
  </svg>
);
const FlagES = () => (
  <svg width="18" height="13" viewBox="0 0 20 14" style={{ display: 'block' }}>
    <rect width="20" height="14" rx="2" fill="#c60b1e"/>
    <rect y="3.5" width="20" height="7" fill="#ffc400"/>
  </svg>
);
const FlagEN = () => (
  <svg width="18" height="13" viewBox="0 0 20 14" style={{ display: 'block' }}>
    <rect width="20" height="14" rx="2" fill="#012169"/>
    <path d="M0 0 L20 14 M20 0 L0 14" stroke="white" strokeWidth="2.5"/>
    <path d="M0 0 L20 14 M20 0 L0 14" stroke="#c8102e" strokeWidth="1.5"/>
    <path d="M10 0 V14 M0 7 H20" stroke="white" strokeWidth="3.5"/>
    <path d="M10 0 V14 M0 7 H20" stroke="#c8102e" strokeWidth="2"/>
  </svg>
);

const btn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 7,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--card2)', border: '1px solid var(--border)',
  cursor: 'pointer', color: 'var(--text2)', transition: 'all 0.18s',
  flexShrink: 0,
};

interface QuickBarProps {
  /** Extra controls to render between language and right edge (e.g. currency toggle) */
  extra?: React.ReactNode;
}

export function QuickBar({ extra }: QuickBarProps) {
  const { theme, toggle: toggleTheme } = useTheme();
  const { lang, toggle: toggleLang }   = useLang();
  const [hubHover, setHubHover]        = useState(false);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.4rem',
    }}>
      {/* Home → Xentory */}
      <a
        href={HUB_URL}
        title="Volver a Xentory"
        style={{
          ...btn,
          background: hubHover ? 'var(--gold-dim)' : 'var(--card2)',
          borderColor: hubHover ? 'var(--gold)' : 'var(--border)',
          color: hubHover ? 'var(--gold)' : 'var(--text2)',
          textDecoration: 'none',
        }}
        onMouseEnter={() => setHubHover(true)}
        onMouseLeave={() => setHubHover(false)}
      >
        <HomeIcon />
      </a>

      {/* Theme */}
      <button
        onClick={toggleTheme}
        style={btn}
        title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text2)'; }}
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>

      {/* Language */}
      <button
        onClick={toggleLang}
        style={{ ...btn, overflow: 'hidden', padding: 0 }}
        title={lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
      >
        {lang === 'es' ? <FlagEN /> : <FlagES />}
      </button>

      {/* Extra slot (e.g. currency for Market) */}
      {extra}
    </div>
  );
}
