import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { useLang } from '../../context/LanguageContext';

// ── SYMBOL CATALOGUE ──────────────────────────────────────────────
const SYMBOLS = [
  { v: 'BTC',     cat: 'crypto',  name: 'Bitcoin' },
  { v: 'ETH',     cat: 'crypto',  name: 'Ethereum' },
  { v: 'SOL',     cat: 'crypto',  name: 'Solana' },
  { v: 'XRP',     cat: 'crypto',  name: 'XRP' },
  { v: 'BNB',     cat: 'crypto',  name: 'BNB' },
  { v: 'DOGE',    cat: 'crypto',  name: 'Dogecoin' },
  { v: 'AVAX',    cat: 'crypto',  name: 'Avalanche' },
  { v: 'ADA',     cat: 'crypto',  name: 'Cardano' },
  { v: 'EUR/USD', cat: 'forex',   name: 'Euro / Dólar' },
  { v: 'GBP/USD', cat: 'forex',   name: 'Libra / Dólar' },
  { v: 'USD/JPY', cat: 'forex',   name: 'Dólar / Yen' },
  { v: 'USD/CHF', cat: 'forex',   name: 'Dólar / Franco' },
  { v: 'NVDA',    cat: 'stocks',  name: 'NVIDIA' },
  { v: 'AAPL',    cat: 'stocks',  name: 'Apple' },
  { v: 'TSLA',    cat: 'stocks',  name: 'Tesla' },
  { v: 'SPY',     cat: 'stocks',  name: 'S&P 500 ETF' },
  { v: 'MSFT',    cat: 'stocks',  name: 'Microsoft' },
  { v: 'AMZN',    cat: 'stocks',  name: 'Amazon' },
  { v: 'META',    cat: 'stocks',  name: 'Meta' },
  { v: 'GOOGL',   cat: 'stocks',  name: 'Alphabet' },
] as const;

type PriceAlert = {
  id: string;
  symbol: string;
  asset_name: string;
  category: string;
  condition: 'above' | 'below';
  target_price: number;
  active: boolean;
  triggered: boolean;
  trigger_price?: number;
  triggered_at?: string;
  created_at: string;
};

const CAT_LABEL: Record<string, string> = { crypto: '🪙', forex: '💱', stocks: '📊' };

// ── SMALL ICON COMPONENTS ─────────────────────────────────────────
const BellIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);
const StarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

export function AlertsPage() {
  const { user } = useAuth();
  const { prefs } = usePreferences();
  const { lang } = useLang();
  const navigate = useNavigate();
  const es = lang === 'es';

  const [alerts, setAlerts]     = useState<PriceAlert[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [tab, setTab]           = useState<'price' | 'signals'>('price');

  // Form state
  const [symbol,    setSymbol]    = useState('BTC');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [price,     setPrice]     = useState('');
  const [formErr,   setFormErr]   = useState('');

  const isPaid = user && (
    user.subscriptions.market !== 'free' ||
    user.subscriptions.bets !== 'free'
  );

  const fetchAlerts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('price_alerts')
      .select('id, symbol, asset_name, category, condition, target_price, active, triggered, trigger_price, triggered_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setAlerts((data ?? []) as PriceAlert[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleAdd = async () => {
    const num = parseFloat(price.replace(',', '.'));
    if (isNaN(num) || num <= 0) { setFormErr(es ? 'Precio no válido' : 'Invalid price'); return; }
    setFormErr('');
    setSaving(true);

    const sym = SYMBOLS.find(s => s.v === symbol)!;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }

    const { error } = await supabase.from('price_alerts').insert({
      user_id:       session.user.id,
      user_email:    session.user.email ?? '',
      symbol:        sym.v,
      asset_name:    sym.name,
      category:      sym.cat,
      condition,
      target_price:  num,
      notify_channel: 'telegram',
    });

    setSaving(false);
    if (error) { setFormErr(error.message); return; }
    setPrice('');
    await fetchAlerts();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('price_alerts').update({ active: false }).eq('id', id);
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  if (!user) return null;

  const activeAlerts    = alerts.filter(a => a.active && !a.triggered);
  const triggeredAlerts = alerts.filter(a => a.triggered);

  const TAB_STYLE = (on: boolean): React.CSSProperties => ({
    flex: 1, padding: '0.48rem', border: 'none', cursor: 'pointer', borderRadius: 8,
    background: on ? 'var(--bg2)' : 'transparent',
    color: on ? 'var(--text)' : 'var(--muted)',
    fontWeight: on ? 600 : 400, fontSize: '0.82rem',
    fontFamily: 'system-ui, sans-serif',
    boxShadow: on ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
    transition: 'all 0.18s',
  });

  const fmt = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 6 });

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: 'calc(var(--bar-h) + 1.8rem) clamp(1rem,4vw,2rem) 4rem' }}>
      {/* Header */}
      <div className="animate-fadeUp" style={{ marginBottom: '1.8rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
          <BellIcon />
          <h1 style={{ fontSize: 'clamp(1.15rem,4vw,1.5rem)', fontFamily: 'Outfit, sans-serif', fontWeight: 800, margin: 0 }}>
            {es ? 'Alertas y notificaciones' : 'Alerts & notifications'}
          </h1>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem', margin: 0 }}>
          {es
            ? 'Configura alertas de precio y gestiona qué señales recibes por Telegram.'
            : 'Set price alerts and manage which signals you receive via Telegram.'}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.3rem', padding: 3, background: 'var(--card)', borderRadius: 10, border: '1px solid var(--border)', marginBottom: '1.6rem' }}>
        <button style={TAB_STYLE(tab === 'price')} onClick={() => setTab('price')}>
          🔔 {es ? 'Alertas de precio' : 'Price alerts'}
        </button>
        <button style={TAB_STYLE(tab === 'signals')} onClick={() => setTab('signals')}>
          📡 {es ? 'Señales personalizadas' : 'Personal signals'}
        </button>
      </div>

      {/* ── TAB: PRICE ALERTS ── */}
      {tab === 'price' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>

          {/* Gate for free users */}
          {!isPaid ? (
            <div className="glass" style={{ borderRadius: 18, padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.8rem' }}>🔔</div>
              <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.4rem' }}>
                {es ? 'Alertas disponibles en planes Pro y Elite' : 'Alerts available on Pro and Elite plans'}
              </p>
              <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: '1.2rem', lineHeight: 1.6 }}>
                {es
                  ? 'Configura alertas ilimitadas y recíbelas directamente en Telegram.'
                  : 'Set unlimited alerts and receive them directly in Telegram.'}
              </p>
              <button className="btn btn-gold" style={{ fontWeight: 700, gap: '0.4rem' }} onClick={() => navigate('/pricing')}>
                <StarIcon /> {es ? 'Ver planes' : 'See plans'}
              </button>
            </div>
          ) : (
            <>
              {/* Add alert form */}
              <div className="glass" style={{ borderRadius: 18, padding: 'clamp(1.2rem,4vw,1.6rem)' }}>
                <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 600, marginBottom: '0.9rem' }}>
                  {es ? 'Nueva alerta' : 'New alert'}
                </p>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  {/* Symbol */}
                  <div style={{ flex: '1 1 130px' }}>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '0.3rem' }}>
                      {es ? 'Activo' : 'Asset'}
                    </label>
                    <select
                      value={symbol}
                      onChange={e => setSymbol(e.target.value)}
                      className="input"
                      style={{ width: '100%' }}
                    >
                      <optgroup label="Crypto">
                        {SYMBOLS.filter(s => s.cat === 'crypto').map(s => (
                          <option key={s.v} value={s.v}>{s.v} — {s.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Forex">
                        {SYMBOLS.filter(s => s.cat === 'forex').map(s => (
                          <option key={s.v} value={s.v}>{s.v}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Stocks">
                        {SYMBOLS.filter(s => s.cat === 'stocks').map(s => (
                          <option key={s.v} value={s.v}>{s.v} — {s.name}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Condition */}
                  <div style={{ flex: '1 1 120px' }}>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '0.3rem' }}>
                      {es ? 'Condición' : 'Condition'}
                    </label>
                    <select
                      value={condition}
                      onChange={e => setCondition(e.target.value as 'above' | 'below')}
                      className="input"
                      style={{ width: '100%' }}
                    >
                      <option value="above">{es ? 'Sube de' : 'Goes above'}</option>
                      <option value="below">{es ? 'Baja de' : 'Falls below'}</option>
                    </select>
                  </div>

                  {/* Price */}
                  <div style={{ flex: '1 1 120px' }}>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '0.3rem' }}>
                      {es ? 'Precio ($)' : 'Price ($)'}
                    </label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={price}
                      onChange={e => setPrice(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAdd()}
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* Add button */}
                  <button
                    className="btn btn-gold"
                    onClick={handleAdd}
                    disabled={saving || !price}
                    style={{ fontWeight: 700, flexShrink: 0, alignSelf: 'flex-end' }}
                  >
                    {saving ? '…' : (es ? '+ Añadir' : '+ Add')}
                  </button>
                </div>
                {formErr && (
                  <p style={{ color: 'var(--red, #ff5c5c)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{formErr}</p>
                )}

                {/* Telegram required notice */}
                {!user.telegramLinked && (
                  <div style={{ marginTop: '0.9rem', padding: '0.6rem 0.9rem', background: 'rgba(201,168,76,0.06)', borderRadius: 8, border: '1px solid rgba(201,168,76,0.18)', fontSize: '0.75rem', color: 'var(--muted)' }}>
                    ⚠️ {es
                      ? 'Necesitas vincular Telegram para recibir las alertas. Genera tu código en el Dashboard.'
                      : 'You need to link Telegram to receive alerts. Generate your code in the Dashboard.'}
                  </div>
                )}
              </div>

              {/* Active alerts list */}
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontSize: '0.82rem' }}>
                  {es ? 'Cargando…' : 'Loading…'}
                </div>
              ) : activeAlerts.length === 0 ? (
                <div className="glass" style={{ borderRadius: 18, padding: '1.8rem', textAlign: 'center' }}>
                  <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: 0 }}>
                    {es ? 'Sin alertas activas. Añade una arriba.' : 'No active alerts. Add one above.'}
                  </p>
                </div>
              ) : (
                <div className="glass" style={{ borderRadius: 18, overflow: 'hidden' }}>
                  <div style={{ padding: '0.9rem 1.2rem', borderBottom: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 600, margin: 0 }}>
                      {es ? `${activeAlerts.length} alerta${activeAlerts.length !== 1 ? 's' : ''} activa${activeAlerts.length !== 1 ? 's' : ''}` : `${activeAlerts.length} active alert${activeAlerts.length !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  {activeAlerts.map((a, i) => (
                    <div key={a.id} style={{
                      display: 'flex', alignItems: 'center', gap: '0.8rem',
                      padding: '0.85rem 1.2rem',
                      borderBottom: i < activeAlerts.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <span style={{ fontSize: '1rem' }}>{CAT_LABEL[a.category]}</span>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{a.symbol}</span>
                        <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                          {' '}{a.condition === 'above' ? (es ? 'sube de' : 'above') : (es ? 'baja de' : 'below')} <strong>${fmt(a.target_price)}</strong>
                        </span>
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--cyan)', background: 'rgba(59,158,255,0.08)', border: '1px solid rgba(59,158,255,0.15)', borderRadius: 6, padding: '0.15rem 0.5rem' }}>
                        {es ? 'Activa' : 'Active'}
                      </span>
                      <button
                        onClick={() => handleDelete(a.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '0.3rem', borderRadius: 6, display: 'flex', alignItems: 'center' }}
                        title={es ? 'Eliminar' : 'Delete'}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Triggered history */}
              {triggeredAlerts.length > 0 && (
                <details style={{ marginTop: '0.2rem' }}>
                  <summary style={{ cursor: 'pointer', color: 'var(--muted)', fontSize: '0.8rem', userSelect: 'none', padding: '0.3rem 0' }}>
                    {es ? `Historial (${triggeredAlerts.length} disparadas)` : `History (${triggeredAlerts.length} triggered)`}
                  </summary>
                  <div className="glass" style={{ borderRadius: 18, overflow: 'hidden', marginTop: '0.6rem' }}>
                    {triggeredAlerts.map((a, i) => (
                      <div key={a.id} style={{
                        display: 'flex', alignItems: 'center', gap: '0.8rem',
                        padding: '0.75rem 1.2rem', opacity: 0.6,
                        borderBottom: i < triggeredAlerts.length - 1 ? '1px solid var(--border)' : 'none',
                      }}>
                        <span>{CAT_LABEL[a.category]}</span>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{a.symbol}</span>
                          <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
                            {' '}{a.condition === 'above' ? (es ? 'subió de' : 'went above') : (es ? 'bajó de' : 'fell below')} ${fmt(a.target_price)}
                            {a.trigger_price != null && ` → $${fmt(a.trigger_price)}`}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--green)' }}>✓ {es ? 'Disparada' : 'Triggered'}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TAB: PERSONAL SIGNALS ── */}
      {tab === 'signals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

          {/* How it works */}
          <div style={{ padding: '1rem 1.2rem', background: 'rgba(59,158,255,0.05)', border: '1px solid rgba(59,158,255,0.15)', borderRadius: 14 }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
              {es ? '¿Cómo funcionan las señales personalizadas?' : 'How do personal signals work?'}
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: 0, lineHeight: 1.65 }}>
              {es
                ? 'Cuando se publica una nueva señal para un activo o equipo que sigues, el bot de Telegram te la envía directamente en privado — solo tú la ves. Las señales de alta confianza (≥70%) también se publican en los canales del grupo para todos los usuarios del plan.'
                : "When a new signal is published for an asset or team you follow, Xentory Bot sends it to you privately — only you see it. High-confidence signals (≥70%) are also broadcast to the group channels for all plan members."}
            </p>
          </div>

          {/* Telegram not linked */}
          {!user.telegramLinked && (
            <div className="glass" style={{ borderRadius: 18, padding: '1.8rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '0.6rem' }}>📲</div>
              <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.4rem' }}>
                {es ? 'Telegram no vinculado' : 'Telegram not linked'}
              </p>
              <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: '1.2rem', lineHeight: 1.6 }}>
                {es
                  ? 'Vincula tu cuenta para que el bot pueda enviarte las señales por privado.'
                  : 'Link your account so the bot can send you signals privately.'}
              </p>
              <button className="btn btn-outline" style={{ gap: '0.4rem' }} onClick={() => navigate('/dashboard')}>
                {es ? 'Ir al Dashboard' : 'Go to Dashboard'}
              </button>
            </div>
          )}

          {/* Followed market assets */}
          <div className="glass" style={{ borderRadius: 18, padding: 'clamp(1.1rem,4vw,1.5rem)' }}>
            <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 600, marginBottom: '0.8rem' }}>
              {es ? 'Activos de mercado seguidos' : 'Followed market assets'}
            </p>
            {[...prefs.market.crypto, ...prefs.market.forex, ...prefs.market.stocks].length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
                {es ? 'Sin activos configurados.' : 'No assets configured.'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {[...prefs.market.crypto, ...prefs.market.forex, ...prefs.market.stocks].map(s => (
                  <span key={s} style={{ padding: '0.28rem 0.75rem', borderRadius: 20, fontSize: '0.78rem', fontWeight: 500, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--gold)' }}>{s}</span>
                ))}
              </div>
            )}
          </div>

          {/* Followed bet teams/leagues */}
          <div className="glass" style={{ borderRadius: 18, padding: 'clamp(1.1rem,4vw,1.5rem)' }}>
            <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 600, marginBottom: '0.8rem' }}>
              {es ? 'Equipos y ligas seguidas' : 'Followed teams & leagues'}
            </p>
            {!prefs.bet.favoriteTeam && prefs.bet.favoriteLeagues.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
                {es ? 'Sin equipos ni ligas configurados.' : 'No teams or leagues configured.'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {prefs.bet.favoriteTeam && (
                  <span style={{ padding: '0.28rem 0.75rem', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600, background: 'rgba(59,158,255,0.08)', border: '1px solid rgba(59,158,255,0.2)', color: 'var(--cyan)' }}>
                    ⭐ {prefs.bet.favoriteTeam}
                  </span>
                )}
                {prefs.bet.favoriteLeagues.map(l => (
                  <span key={l} style={{ padding: '0.28rem 0.75rem', borderRadius: 20, fontSize: '0.78rem', fontWeight: 500, background: 'var(--card2)', border: '1px solid var(--border)', color: 'var(--text2)' }}>{l}</span>
                ))}
              </div>
            )}
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center' }}>
            {es
              ? 'Edita tus activos y equipos favoritos en '
              : 'Edit your favourite assets and teams in '}
            <button
              onClick={() => navigate('/dashboard')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary, var(--gold))', textDecoration: 'underline', fontSize: 'inherit', padding: 0 }}
            >
              {es ? 'Preferencias' : 'Preferences'}
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
