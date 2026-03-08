import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getLiveAssets, formatPrice, subscribePrices } from '../../services/marketService';
import { MOCK_ASSETS } from '../../constants';
import type { Asset } from '../../types';
import {
  loadAlerts, createAlert, toggleAlert, deleteAlert,
  getTelegramConnection, upsertVerifyCode, generateVerifyCode,
  type PriceAlert, type AlertCategory, type AlertCondition, type AlertChannel,
} from '../../services/alertService';

// ── WATCHLIST PAGE ──
export function WatchlistPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>(['btc', 'eth', 'nvda']);
  const [searchQ, setSearchQ] = useState('');
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  // Track which assets flashed green/red on update
  const [flashed, setFlashed] = useState<Record<string, 'up' | 'down'>>({});
  const prevPrices = useRef<Record<string, number>>({});

  useEffect(() => {
    // Initial load
    const live = getLiveAssets();
    setAllAssets(live);
    setAssets(live.filter(a => watchlist.includes(a.id)));

    // Subscribe to live price pushes
    const unsub = subscribePrices((updates) => {
      setAllAssets(getLiveAssets());
      setAssets(getLiveAssets().filter(a => watchlist.includes(a.id)));

      // Flash animation for changed prices
      const newFlashes: Record<string, 'up' | 'down'> = {};
      Object.entries(updates).forEach(([id, price]) => {
        if (price === undefined) return;
        const prev = prevPrices.current[id];
        if (prev !== undefined && price !== prev) {
          newFlashes[id] = (price as number) > prev ? 'up' : 'down';
        }
        prevPrices.current[id] = price as number;
      });
      if (Object.keys(newFlashes).length > 0) {
        setFlashed(f => ({ ...f, ...newFlashes }));
        setTimeout(() => setFlashed(f => {
          const cleared = { ...f };
          Object.keys(newFlashes).forEach(k => delete cleared[k]);
          return cleared;
        }), 800);
      }
    });
    return unsub;
  }, [watchlist]);

  const canAdd = user?.plan !== 'free' || watchlist.length < 3;
  const filtered = searchQ ? allAssets.filter(a =>
    a.symbol.toLowerCase().includes(searchQ.toLowerCase()) ||
    a.name.toLowerCase().includes(searchQ.toLowerCase())
  ) : [];

  const toggle = (id: string) => {
    if (watchlist.includes(id)) {
      setWatchlist(w => w.filter(x => x !== id));
    } else if (canAdd) {
      setWatchlist(w => [...w, id]);
    }
  };

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 900, width: '100%' }}>
      <div className="mkt-watchlist-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>⭐ Mi Watchlist</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            {watchlist.length} activos · {user?.plan === 'free' ? `máx. 3 (plan Gratis)` : 'ilimitados'}
          </p>
        </div>
        <div style={{ position: 'relative' }}>
          <input
            className="input"
            style={{ width: '100%', paddingRight: '2.5rem' }}
            placeholder="Buscar activo..."
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
          />
          {searchQ && (
            <div className="glass-2" style={{
              position: 'absolute', top: '110%', left: 0, right: 0,
              borderRadius: 10, overflow: 'hidden', zIndex: 100,
              maxHeight: 280, overflowY: 'auto',
            }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '1rem', color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center' }}>Sin resultados</div>
              ) : filtered.map(a => (
                <div
                  key={a.id}
                  onClick={() => { toggle(a.id); setSearchQ(''); }}
                  style={{
                    padding: '0.8rem 1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid var(--border)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--card2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <span style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '0.9rem' }}>{a.symbol}</span>
                    <span style={{ color: 'var(--muted)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>{a.name}</span>
                  </div>
                  <span style={{ color: watchlist.includes(a.id) ? 'var(--gold)' : 'var(--muted)', fontSize: '0.8rem' }}>
                    {watchlist.includes(a.id) ? '⭐ Añadido' : '+ Añadir'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="glass" style={{ borderRadius: 16, padding: '4rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⭐</div>
          <h3 style={{ marginBottom: '0.5rem' }}>Tu watchlist está vacía</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>Busca activos arriba para añadirlos a tu seguimiento</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {assets.map(asset => {
            const isUp = asset.changePercent24h >= 0;
            return (
              <div
                key={asset.id}
                className="glass"
                style={{
                  borderRadius: 14,
                  padding: '1.2rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div style={{ flex: 1 }} onClick={() => navigate(`/market/${asset.id}`)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '1rem' }}>{asset.symbol}</div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{asset.name}</span>
                  </div>
                </div>
                <div style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '1.1rem' }} onClick={() => navigate(`/market/${asset.id}`)}>
                  {formatPrice(asset.price, asset.category)}
                </div>
                <div style={{ color: isUp ? 'var(--green)' : 'var(--red)', fontWeight: 500, minWidth: 70, textAlign: 'right' }} onClick={() => navigate(`/market/${asset.id}`)}>
                  {isUp ? '▲' : '▼'} {Math.abs(asset.changePercent24h).toFixed(2)}%
                </div>
                <button
                  onClick={() => toggle(asset.id)}
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--red)', flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {user?.plan === 'free' && (
        <div style={{
          marginTop: '1.5rem', padding: '1rem 1.5rem',
          background: 'var(--gold-dim)', border: '1px solid rgba(201,168,76,0.2)',
          borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text2)' }}>
            Plan Gratis: máximo 3 activos. <strong style={{ color: 'var(--gold)' }}>Pro/Elite</strong>: watchlist ilimitada + alertas.
          </span>
          <button onClick={() => navigate('/plans')} className="btn btn-gold btn-sm">Mejorar</button>
        </div>
      )}
    </div>
  );
}

// ── ALERTS PAGE ──
export function AlertsPage() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  // ── State ──────────────────────────────────────────────────────
  const [alerts,      setAlerts]      = useState<PriceAlert[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [filterCat,   setFilterCat]   = useState<AlertCategory | 'all'>('all');
  const [showForm,    setShowForm]    = useState(false);
  const [tgConn,      setTgConn]      = useState<any>(null);
  const [tgLoading,   setTgLoading]   = useState(false);
  const [verifyCode,  setVerifyCode]  = useState('');
  const [saveMsg,     setSaveMsg]     = useState<{type:'ok'|'err', text:string} | null>(null);

  // New alert form
  const [newSymbol,    setNewSymbol]    = useState('BTC');
  const [newName,      setNewName]      = useState('Bitcoin');
  const [newCat,       setNewCat]       = useState<AlertCategory>('crypto');
  const [newCondition, setNewCondition] = useState<AlertCondition>('above');
  const [newTarget,    setNewTarget]    = useState('');
  const [newChannel,   setNewChannel]   = useState<AlertChannel>('telegram');

  const isPaid = user?.plan !== 'free';

  // ── Load on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);

    // Generate verify code (deterministic from user_id)
    const code = generateVerifyCode(user.id, 'market');
    setVerifyCode(code);

    // Load alerts + telegram connection in parallel
    Promise.all([
      loadAlerts(user.id),
      getTelegramConnection(user.id, 'market'),
    ]).then(([a, conn]) => {
      setAlerts(a);
      setTgConn(conn);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user?.id]);

  // ── Connect Telegram ───────────────────────────────────────────
  const handleConnectTg = async () => {
    if (!isPaid) { navigate('/plans'); return; }
    if (!user) return;
    setTgLoading(true);
    try {
      // Save code to Supabase so bot can verify it
      await upsertVerifyCode(user.id, user.email, 'market', user.plan);
      // Open bot with deep link carrying the code
      window.open(`https://t.me/XentoryMarketBot?start=${verifyCode}`, '_blank');
    } catch (e) {
      console.error(e);
    } finally {
      setTgLoading(false);
    }
  };

  // Poll connection status after opening bot (check every 3s for 30s)
  const pollConnection = () => {
    if (!user?.id) return;
    let tries = 0;
    const iv = setInterval(async () => {
      tries++;
      const conn = await getTelegramConnection(user.id, 'market');
      if (conn) { setTgConn(conn); clearInterval(iv); return; }
      if (tries >= 10) clearInterval(iv);
    }, 3000);
  };

  // ── Create alert ───────────────────────────────────────────────
  const handleAddAlert = async () => {
    if (!user || !newTarget || isNaN(Number(newTarget))) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const alert = await createAlert({
        userId:        user.id,
        userEmail:     user.email,
        symbol:        newSymbol,
        assetName:     newName,
        category:      newCat,
        condition:     newCondition,
        targetPrice:   Number(newTarget),
        notifyChannel: newChannel,
      });
      setAlerts(prev => [alert, ...prev]);
      setNewTarget('');
      setShowForm(false);
      setSaveMsg({ type: 'ok', text: `✅ Alerta para ${newSymbol} creada correctamente` });
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (e: any) {
      setSaveMsg({ type: 'err', text: `❌ ${e.message ?? 'Error al crear la alerta'}` });
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle active ──────────────────────────────────────────────
  const handleToggle = async (id: string, active: boolean) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, active } : a));
    try { await toggleAlert(id, active); }
    catch { setAlerts(prev => prev.map(a => a.id === id ? { ...a, active: !active } : a)); }
  };

  // ── Delete ─────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    try { await deleteAlert(id); }
    catch { /* alert already removed from UI */ }
  };

  const ALL_ASSETS = [
    { symbol: 'BTC',     name: 'Bitcoin',      category: 'crypto' as AlertCategory },
    { symbol: 'ETH',     name: 'Ethereum',      category: 'crypto' as AlertCategory },
    { symbol: 'SOL',     name: 'Solana',        category: 'crypto' as AlertCategory },
    { symbol: 'XRP',     name: 'XRP',           category: 'crypto' as AlertCategory },
    { symbol: 'BNB',     name: 'BNB',           category: 'crypto' as AlertCategory },
    { symbol: 'ADA',     name: 'Cardano',       category: 'crypto' as AlertCategory },
    { symbol: 'DOGE',    name: 'Dogecoin',      category: 'crypto' as AlertCategory },
    { symbol: 'AVAX',    name: 'Avalanche',     category: 'crypto' as AlertCategory },
    { symbol: 'NVDA',    name: 'NVIDIA',        category: 'stocks' as AlertCategory },
    { symbol: 'AAPL',    name: 'Apple',         category: 'stocks' as AlertCategory },
    { symbol: 'TSLA',    name: 'Tesla',         category: 'stocks' as AlertCategory },
    { symbol: 'MSFT',    name: 'Microsoft',     category: 'stocks' as AlertCategory },
    { symbol: 'AMZN',    name: 'Amazon',        category: 'stocks' as AlertCategory },
    { symbol: 'GOOGL',   name: 'Alphabet',      category: 'stocks' as AlertCategory },
    { symbol: 'EUR/USD', name: 'Euro / Dólar',  category: 'forex'  as AlertCategory },
    { symbol: 'GBP/USD', name: 'Libra / Dólar', category: 'forex'  as AlertCategory },
    { symbol: 'XAU/USD', name: 'Oro / Dólar',   category: 'forex'  as AlertCategory },
  ];

  const CAT_LABELS: Record<string, string> = { all: 'Todos', crypto: '🪙 Cripto', stocks: '📊 Acciones', forex: '💱 Forex' };
  const CH_LABELS:  Record<AlertChannel, string> = { telegram: '✈️ Telegram', email: '📧 Email', both: '🔔 Ambos' };
  const CH_COLORS:  Record<AlertChannel, string> = { telegram: '#2aabee', email: 'var(--gold)', both: 'var(--green)' };
  const CAT_EMOJI:  Record<string, string>        = { crypto: '🪙', stocks: '📊', forex: '💱' };

  const catAssets = (newCat as string) === 'all' ? ALL_ASSETS : ALL_ASSETS.filter(a => a.category === newCat);
  const filtered  = filterCat === 'all' ? alerts : alerts.filter(a => a.category === filterCat);

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 860, width: '100%' }}>

      {/* Header */}
      <div className="mkt-alerts-header">
        <div>
          <h1 style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>🔔 Alertas de precio</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Recibe notificaciones cuando un activo alcance tu precio objetivo.</p>
        </div>
        {isPaid && (
          <button onClick={() => setShowForm(v => !v)} className="btn btn-gold" style={{ flexShrink: 0 }}>
            {showForm ? '✕ Cancelar' : '+ Nueva alerta'}
          </button>
        )}
      </div>

      {/* Save message */}
      {saveMsg && (
        <div style={{ marginBottom: '1rem', padding: '0.7rem 1rem', borderRadius: 9,
          background: saveMsg.type === 'ok' ? 'rgba(0,255,136,0.08)' : 'rgba(255,68,85,0.08)',
          border: `1px solid ${saveMsg.type === 'ok' ? 'rgba(0,255,136,0.2)' : 'rgba(255,68,85,0.2)'}`,
          color: saveMsg.type === 'ok' ? 'var(--green)' : 'var(--red)', fontSize: '0.85rem',
        }}>{saveMsg.text}</div>
      )}

      {/* Telegram connection banner */}
      <div className="glass mkt-tg-banner" style={{ borderRadius: 14, padding: '1.2rem 1.5rem', marginBottom: '1.5rem',
        display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between',
        borderColor: tgConn ? 'rgba(42,171,238,0.3)' : 'var(--border)',
      }}>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, fontSize: '1.3rem',
            background: tgConn ? 'rgba(42,171,238,0.12)' : 'var(--card2)',
            border: tgConn ? '1px solid rgba(42,171,238,0.3)' : '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✈️</div>
          <div>
            <div style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '0.92rem' }}>
              Telegram{' '}
              {tgConn
                ? <span style={{ color: 'var(--green)', fontSize: '0.75rem', marginLeft: '0.3rem' }}>● Conectado{tgConn.telegram_username ? ` · @${tgConn.telegram_username}` : ''}</span>
                : <span style={{ color: 'var(--muted)', fontSize: '0.75rem', marginLeft: '0.3rem' }}>● Sin conectar</span>
              }
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
              {tgConn ? 'Las alertas se enviarán a tu Telegram privado' : 'Conecta para recibir alertas directamente en Telegram'}
            </div>
          </div>
        </div>
        <div className="mkt-tg-banner-btns">
          {!tgConn ? (
            <button onClick={() => { handleConnectTg(); pollConnection(); }} disabled={tgLoading}
              style={{ padding: '0.5rem 1rem', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600,
                cursor: 'pointer', background: 'rgba(42,171,238,0.12)', border: '1px solid rgba(42,171,238,0.4)',
                color: '#2aabee', transition: 'all 0.2s', opacity: tgLoading ? 0.6 : 1,
              }}>
              {tgLoading ? '⏳ Abriendo…' : '✈️ Conectar Telegram'}
            </button>
          ) : (
            <div style={{ padding: '0.5rem 1rem', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600,
              background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.3)', color: 'var(--green)',
            }}>✓ Telegram activo</div>
          )}
          <button style={{ padding: '0.5rem 1rem', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600,
            cursor: 'pointer', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.3)',
            color: 'var(--gold)', transition: 'all 0.2s',
          }}>📧 Email</button>
        </div>
      </div>

      {!isPaid ? (
        <div className="glass" style={{ borderRadius: 16, padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔔</div>
          <h3 style={{ marginBottom: '0.5rem' }}>Alertas personalizadas — Plan Pro</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Crea alertas ilimitadas para cualquier activo. Recíbelas en Telegram o Email al instante.
          </p>
          <button onClick={() => navigate('/plans')} className="btn btn-gold">💎 Activar Plan Pro</button>
        </div>
      ) : (
        <>
          {/* New alert form */}
          {showForm && (
            <div className="glass" style={{ borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem',
              border: '1px solid rgba(201,168,76,0.2)', animation: 'fadeIn 0.2s ease',
            }}>
              <h3 style={{ fontSize: '0.95rem', marginBottom: '1.2rem' }}>✨ Configurar nueva alerta</h3>

              {/* Category */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Tipo de activo</div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {(['crypto','stocks','forex'] as AlertCategory[]).map(cat => (
                    <button key={cat} onClick={() => {
                      setNewCat(cat);
                      const first = ALL_ASSETS.find(a => a.category === cat);
                      if (first) { setNewSymbol(first.symbol); setNewName(first.name); }
                    }} style={{
                      padding: '0.35rem 0.85rem', borderRadius: 100, fontSize: '0.8rem', cursor: 'pointer',
                      background: newCat === cat ? 'var(--gold-dim)' : 'var(--card2)',
                      border: newCat === cat ? '1px solid var(--gold)' : '1px solid var(--border)',
                      color: newCat === cat ? 'var(--gold)' : 'var(--text2)', fontWeight: newCat === cat ? 600 : 400,
                      transition: 'all 0.15s',
                    }}>{CAT_LABELS[cat]}</button>
                  ))}
                </div>
              </div>

              {/* Asset / Condition / Price */}
              <div className="mkt-alert-form-grid">
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Activo</div>
                  <select value={newSymbol} onChange={e => {
                    const a = ALL_ASSETS.find(x => x.symbol === e.target.value);
                    if (a) { setNewSymbol(a.symbol); setNewName(a.name); }
                  }} style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: 8, background: 'var(--card2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.85rem', cursor: 'pointer' }}>
                    {catAssets.map(a => <option key={a.symbol} value={a.symbol}>{a.symbol} — {a.name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Condición</div>
                  <div className="mkt-alert-condition-btns" style={{ display: 'flex', gap: '0.4rem' }}>
                    {(['above','below'] as AlertCondition[]).map(c => (
                      <button key={c} onClick={() => setNewCondition(c)} style={{
                        flex: 1, padding: '0.55rem 0', borderRadius: 8, fontSize: '0.82rem', cursor: 'pointer',
                        fontWeight: newCondition === c ? 700 : 400, transition: 'all 0.15s',
                        background: newCondition === c ? (c === 'above' ? 'rgba(0,255,136,0.1)' : 'rgba(255,68,85,0.1)') : 'var(--card2)',
                        border: newCondition === c ? (c === 'above' ? '1px solid rgba(0,255,136,0.4)' : '1px solid rgba(255,68,85,0.4)') : '1px solid var(--border)',
                        color: newCondition === c ? (c === 'above' ? 'var(--green)' : 'var(--red)') : 'var(--text2)',
                      }}>{c === 'above' ? '📈 Sube a' : '📉 Baja de'}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Precio objetivo</div>
                  <input type="number" placeholder="ej. 105000" value={newTarget} onChange={e => setNewTarget(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: 8, background: 'var(--card2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Notify channel */}
              <div style={{ marginBottom: '1.2rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Notificar por</div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {(['telegram','email','both'] as AlertChannel[]).map(ch => (
                    <button key={ch} onClick={() => setNewChannel(ch)} style={{
                      padding: '0.4rem 0.9rem', borderRadius: 100, fontSize: '0.8rem', cursor: 'pointer',
                      background: newChannel === ch ? `${CH_COLORS[ch]}15` : 'var(--card2)',
                      border: newChannel === ch ? `1px solid ${CH_COLORS[ch]}` : '1px solid var(--border)',
                      color: newChannel === ch ? CH_COLORS[ch] : 'var(--text2)', fontWeight: newChannel === ch ? 600 : 400,
                      transition: 'all 0.15s',
                    }}>{CH_LABELS[ch]}</button>
                  ))}
                </div>
                {(newChannel === 'telegram' || newChannel === 'both') && !tgConn && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#2aabee', background: 'rgba(42,171,238,0.08)', padding: '0.4rem 0.8rem', borderRadius: 6 }}>
                    ⚠️ Conecta Telegram arriba para recibir esta alerta en Telegram
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowForm(false)} style={{ padding: '0.55rem 1.2rem', borderRadius: 8, background: 'var(--card2)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', fontSize: '0.85rem' }}>Cancelar</button>
                <button onClick={handleAddAlert} disabled={saving || !newTarget} className="btn btn-gold" style={{ opacity: !newTarget || saving ? 0.5 : 1 }}>
                  {saving ? '⏳ Guardando…' : '✓ Crear alerta'}
                </button>
              </div>
            </div>
          )}

          {/* Category filter */}
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {(['all','crypto','stocks','forex'] as (AlertCategory | 'all')[]).map(cat => (
              <button key={cat} onClick={() => setFilterCat(cat)} style={{
                padding: '0.3rem 0.75rem', borderRadius: 100, fontSize: '0.78rem', cursor: 'pointer',
                background: filterCat === cat ? 'var(--gold-dim)' : 'var(--card2)',
                border: filterCat === cat ? '1px solid var(--gold)' : '1px solid var(--border)',
                color: filterCat === cat ? 'var(--gold)' : 'var(--muted)', transition: 'all 0.15s',
              }}>{CAT_LABELS[cat]}</button>
            ))}
          </div>

          {/* Alerts list */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>Cargando alertas…
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--muted)', fontSize: '0.88rem' }}>
                  {filterCat === 'all' ? 'No tienes alertas configuradas. Pulsa "+ Nueva alerta" para crear una.' : `Sin alertas de ${CAT_LABELS[filterCat]}.`}
                </div>
              ) : filtered.map(alert => (
                <div key={alert.id} className="glass mkt-alert-card" style={{
                  borderRadius: 12, display: 'flex', alignItems: 'center',
                  opacity: alert.active ? 1 : 0.5,
                  borderColor: alert.triggered
                    ? 'rgba(201,168,76,0.3)'
                    : alert.active
                      ? (alert.condition === 'above' ? 'rgba(0,255,136,0.15)' : 'rgba(255,68,85,0.15)')
                      : 'var(--border)',
                }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: alert.triggered ? 'rgba(201,168,76,0.1)' : alert.condition === 'above' ? 'rgba(0,255,136,0.1)' : 'rgba(255,68,85,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
                  }}>
                    {alert.triggered ? '✅' : alert.condition === 'above' ? '📈' : '📉'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '0.95rem' }}>{alert.symbol}</span>
                      <span className="mkt-alert-cat-badge" style={{ fontSize: '0.7rem', padding: '0.1rem 0.5rem', borderRadius: 100, background: 'var(--card2)', color: 'var(--muted)' }}>
                        {CAT_EMOJI[alert.category]} {alert.category}
                      </span>
                      {alert.triggered && <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.5rem', borderRadius: 100, background: 'rgba(201,168,76,0.1)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.2)' }}>✓ Activada</span>}
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                      Avisar cuando {alert.condition === 'above' ? 'suba a' : 'baje de'}{' '}
                      <strong style={{ color: 'var(--text)' }}>${Number(alert.target_price).toLocaleString()}</strong>
                      {' · '}
                      <span style={{ color: CH_COLORS[alert.notify_channel as AlertChannel] }}>{CH_LABELS[alert.notify_channel as AlertChannel]}</span>
                    </div>
                  </div>
                  {/* Toggle */}
                  {!alert.triggered && (
                    <button onClick={() => handleToggle(alert.id, !alert.active)}
                      style={{ width: 34, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', flexShrink: 0,
                        background: alert.active ? 'var(--green)' : 'var(--card2)', position: 'relative', transition: 'background 0.2s',
                      }}>
                      <span style={{ position: 'absolute', top: 3, width: 14, height: 14, borderRadius: '50%', background: 'white', transition: 'left 0.2s', left: alert.active ? 17 : 3 }} />
                    </button>
                  )}
                  {/* Delete */}
                  <button onClick={() => handleDelete(alert.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1rem', flexShrink: 0, padding: '0.2rem 0.4rem', borderRadius: 6 }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                  >✕</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
// ── ANALYSIS PAGE ──
export function AnalysisPage() {
  const navigate = useNavigate();

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 1000, width: '100%' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>🧠 Análisis IA</h1>
        <p style={{ color: 'var(--muted)' }}>Selecciona un activo para generar un análisis profundo.</p>
      </div>

      <div className="mkt-analysis-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem' }}>
        {MOCK_ASSETS.map(asset => {
          const isUp = asset.changePercent24h >= 0;
          return (
            <div
              key={asset.id}
              className="glass"
              onClick={() => navigate(`/market/${asset.id}`)}
              style={{ borderRadius: 12, padding: '1.2rem', cursor: 'pointer', transition: 'border-color 0.2s, transform 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                <div style={{ fontFamily: 'Urbanist', fontWeight: 700 }}>{asset.symbol}</div>
                <span style={{ color: isUp ? 'var(--green)' : 'var(--red)', fontSize: '0.8rem', fontWeight: 500 }}>
                  {isUp ? '▲' : '▼'} {Math.abs(asset.changePercent24h).toFixed(2)}%
                </span>
              </div>
              <div style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.2rem' }}>
                {formatPrice(asset.price, asset.category)}
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>{asset.name} · {asset.category}</div>
              <div style={{ marginTop: '0.8rem', fontSize: '0.75rem', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                🧠 Analizar →
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}