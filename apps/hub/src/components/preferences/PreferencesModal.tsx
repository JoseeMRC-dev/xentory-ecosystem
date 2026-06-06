import { useState, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePreferences, type Preferences } from '../../context/PreferencesContext';
import { useLang } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

const CRYPTO_OPTIONS  = ['BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'DOGE', 'AVAX', 'ADA'];
const FOREX_OPTIONS   = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF'];
const STOCK_OPTIONS   = ['NVDA', 'AAPL', 'TSLA', 'SPY', 'MSFT', 'AMZN', 'META', 'GOOGL'];
const LEAGUE_OPTIONS  = [
  'Champions League', 'La Liga', 'Premier League', 'Serie A', 'Bundesliga',
  'Ligue 1', 'NBA', 'NFL', 'MLB', 'ATP/WTA', 'UFC/MMA', 'Formula 1',
];

type Tab = 'market' | 'bet';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: '0.67rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 600, marginBottom: '0.6rem', fontFamily: 'system-ui, sans-serif' }}>{title}</p>
      {children}
    </div>
  );
}

function ChipRow({ items, active, onToggle }: { items: string[]; active: string[]; onToggle: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
      {items.map(v => <Chip key={v} label={v} active={active.includes(v)} onToggle={() => onToggle(v)} />)}
    </div>
  );
}

function Chip({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        padding: '0.32rem 0.85rem', borderRadius: 20, cursor: 'pointer', transition: 'all 0.15s',
        border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border)'}`,
        background: active ? 'var(--accent-light)' : 'var(--card)',
        color: active ? 'var(--accent-primary)' : 'var(--text2)',
        fontSize: '0.78rem', fontWeight: active ? 600 : 400,
        fontFamily: 'system-ui, sans-serif',
      }}
    >{label}</button>
  );
}

const toggle = (arr: string[], v: string) =>
  arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

interface Props { onClose: () => void; }

export function PreferencesModal({ onClose }: Props) {
  const { prefs, setPrefs } = usePreferences();
  const { lang } = useLang();
  const { user } = useAuth();
  const navigate = useNavigate();
  const es = lang === 'es';
  const [tab, setTab]       = useState<Tab>('market');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSave = async () => {
    setSaving(true);
    await setPrefs(local);
    setSaving(false);
    setSaved(true);
    savedTimer.current = setTimeout(() => { setSaved(false); onClose(); }, 900);
  };

  const [local, setLocal] = useState<Preferences>({
    market: { ...prefs.market, crypto: [...prefs.market.crypto], forex: [...prefs.market.forex], stocks: [...prefs.market.stocks] },
    bet:    { ...prefs.bet,    favoriteLeagues: [...prefs.bet.favoriteLeagues] },
  });

  const updM = <K extends keyof typeof local.market>(k: K, v: typeof local.market[K]) =>
    setLocal(p => ({ ...p, market: { ...p.market, [k]: v } }));
  const updB = <K extends keyof typeof local.bet>(k: K, v: typeof local.bet[K]) =>
    setLocal(p => ({ ...p, bet: { ...p.bet, [k]: v } }));

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '0.48rem', border: 'none', cursor: 'pointer', borderRadius: 8,
    background: active ? 'var(--bg2)' : 'transparent',
    color: active ? 'var(--text)' : 'var(--muted)',
    fontWeight: active ? 600 : 400, fontSize: '0.82rem',
    fontFamily: 'system-ui, sans-serif',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
    transition: 'all 0.18s',
  });

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(4,6,15,0.75)', backdropFilter: 'blur(8px)', zIndex: 1000, animation: 'fadeIn 0.2s ease' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1001,
        background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 20,
        width: 'min(95vw, 540px)', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        animation: 'fadeUp 0.25s ease', boxShadow: '0 40px 100px rgba(0,0,0,0.5)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '1.4rem 1.6rem 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, fontFamily: 'system-ui, sans-serif' }}>
                {es ? 'Personalización' : 'Preferences'}
              </h2>
              <p style={{ fontSize: '0.74rem', color: 'var(--muted)', margin: '0.2rem 0 0', fontFamily: 'system-ui, sans-serif' }}>
                {es ? 'Elige qué datos quieres seguir' : 'Choose what data you want to track'}
              </p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.2rem', padding: '0.3rem', lineHeight: 1 }}>✕</button>
          </div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.3rem', padding: 3, background: 'var(--card)', borderRadius: 10, border: '1px solid var(--border)', marginBottom: '1.2rem' }}>
            <button style={TAB_STYLE(tab === 'market')} onClick={() => setTab('market')}>
              {es ? '📈 Mercado' : '📈 Market'}
            </button>
            <button style={TAB_STYLE(tab === 'bet')} onClick={() => setTab('bet')}>
              {es ? '⚽ Apuestas' : '⚽ Bets'}
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ padding: '0 1.6rem 1rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
          {tab === 'market' && !user ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1rem', gap: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>📈</div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 0.35rem', fontFamily: 'system-ui, sans-serif' }}>
                  {es ? 'Inicia sesión para personalizar el mercado' : 'Sign in to personalise the market'}
                </p>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: 0, lineHeight: 1.6, fontFamily: 'system-ui, sans-serif' }}>
                  {es
                    ? 'Guarda tus criptomonedas, pares de forex y acciones favoritas para ver siempre lo que más te importa.'
                    : 'Save your favourite crypto, forex pairs and stocks to always see what matters most first.'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  onClick={() => { onClose(); navigate('/register'); }}
                  className="btn btn-gold"
                  style={{ fontWeight: 700 }}
                >
                  {es ? 'Crear cuenta gratis' : 'Create free account'}
                </button>
                <button
                  onClick={() => { onClose(); navigate('/login'); }}
                  className="btn btn-outline"
                >
                  {es ? 'Iniciar sesión' : 'Sign in'}
                </button>
              </div>
              {/* Preview bloqueado */}
              <div style={{ width: '100%', marginTop: '0.5rem', opacity: 0.35, pointerEvents: 'none', userSelect: 'none' }}>
                <p style={{ fontSize: '0.67rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 600, marginBottom: '0.6rem', fontFamily: 'system-ui, sans-serif' }}>
                  {es ? 'Criptomonedas' : 'Crypto'}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {CRYPTO_OPTIONS.slice(0, 5).map(l => (
                    <span key={l} style={{ padding: '0.32rem 0.85rem', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text2)', fontSize: '0.78rem', fontFamily: 'system-ui, sans-serif' }}>{l}</span>
                  ))}
                </div>
                <p style={{ fontSize: '0.67rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 600, margin: '1rem 0 0.6rem', fontFamily: 'system-ui, sans-serif' }}>
                  {es ? 'Acciones' : 'Stocks'}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {STOCK_OPTIONS.slice(0, 5).map(l => (
                    <span key={l} style={{ padding: '0.32rem 0.85rem', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text2)', fontSize: '0.78rem', fontFamily: 'system-ui, sans-serif' }}>{l}</span>
                  ))}
                </div>
              </div>
            </div>
          ) : tab === 'market' ? (
            <>
              <Section title={es ? 'Criptomonedas' : 'Crypto'}>
                <ChipRow items={CRYPTO_OPTIONS} active={local.market.crypto} onToggle={v => updM('crypto', toggle(local.market.crypto, v))} />
              </Section>
              <Section title="Forex">
                <ChipRow items={FOREX_OPTIONS} active={local.market.forex} onToggle={v => updM('forex', toggle(local.market.forex, v))} />
              </Section>
              <Section title={es ? 'Acciones' : 'Stocks'}>
                <ChipRow items={STOCK_OPTIONS} active={local.market.stocks} onToggle={v => updM('stocks', toggle(local.market.stocks, v))} />
              </Section>
            </>
          ) : !user ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1rem', gap: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>⚽</div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 0.35rem', fontFamily: 'system-ui, sans-serif' }}>
                  {es ? 'Inicia sesión para personalizar apuestas' : 'Sign in to personalise bets'}
                </p>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: 0, lineHeight: 1.6, fontFamily: 'system-ui, sans-serif' }}>
                  {es
                    ? 'Guarda tu equipo favorito y las ligas que más te interesan para ver primero lo que importa.'
                    : 'Save your favourite team and leagues to always see what matters most first.'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  onClick={() => { onClose(); navigate('/register'); }}
                  className="btn btn-gold"
                  style={{ fontWeight: 700 }}
                >
                  {es ? 'Crear cuenta gratis' : 'Create free account'}
                </button>
                <button
                  onClick={() => { onClose(); navigate('/login'); }}
                  className="btn btn-outline"
                >
                  {es ? 'Iniciar sesión' : 'Sign in'}
                </button>
              </div>
              {/* Preview bloqueado */}
              <div style={{ width: '100%', marginTop: '0.5rem', opacity: 0.35, pointerEvents: 'none', userSelect: 'none' }}>
                <p style={{ fontSize: '0.67rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 600, marginBottom: '0.6rem', fontFamily: 'system-ui, sans-serif' }}>
                  {es ? 'Equipo favorito' : 'Favourite team'}
                </p>
                <input className="input" type="text" disabled placeholder={es ? 'Ej: Real Madrid, Liverpool...' : 'E.g: Liverpool, PSG...'} style={{ width: '100%' }} />
                <p style={{ fontSize: '0.67rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 600, margin: '1rem 0 0.6rem', fontFamily: 'system-ui, sans-serif' }}>
                  {es ? 'Ligas y competiciones' : 'Leagues & competitions'}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {LEAGUE_OPTIONS.slice(0, 6).map(l => (
                    <span key={l} style={{ padding: '0.32rem 0.85rem', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text2)', fontSize: '0.78rem', fontFamily: 'system-ui, sans-serif' }}>{l}</span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <Section title={es ? 'Equipo favorito' : 'Favorite team'}>
                <input
                  className="input"
                  type="text"
                  placeholder={es ? 'Ej: Real Madrid, Liverpool...' : 'E.g: Liverpool, PSG...'}
                  value={local.bet.favoriteTeam}
                  onChange={e => updB('favoriteTeam', e.target.value)}
                  style={{ width: '100%' }}
                />
                {local.bet.favoriteTeam && (
                  <p style={{ fontSize: '0.7rem', color: 'var(--green)', marginTop: '0.4rem', fontFamily: 'system-ui, sans-serif' }}>
                    ✓ {es ? 'Los partidos de' : 'Matches of'} <strong>{local.bet.favoriteTeam}</strong> {es ? 'aparecerán primero en Xentory Bet' : 'will appear first in Xentory Bet'}
                  </p>
                )}
              </Section>
              <Section title={es ? 'Ligas y competiciones favoritas' : 'Favorite leagues & competitions'}>
                <ChipRow items={LEAGUE_OPTIONS} active={local.bet.favoriteLeagues} onToggle={v => updB('favoriteLeagues', toggle(local.bet.favoriteLeagues, v))} />
              </Section>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.6rem', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: '0.7rem' }}>
          <button onClick={onClose} disabled={saving} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>
            {es ? 'Cancelar' : 'Cancel'}
          </button>
          {!!user && (
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className="btn btn-gold"
              style={{ flex: 1, justifyContent: 'center', fontWeight: 700, gap: '0.5rem', transition: 'all 0.2s' }}
            >
              {saved ? (
                <>{es ? '✓ Guardado' : '✓ Saved'}</>
              ) : saving ? (
                <>
                  <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                  {es ? 'Guardando…' : 'Saving…'}
                </>
              ) : (
                <>{es ? 'Guardar preferencias' : 'Save preferences'}</>
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
