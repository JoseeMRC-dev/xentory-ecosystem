import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  getTelegramConnection, upsertVerifyCode, generateVerifyCode,
  type TelegramConnection,
} from '../../services/alertService';

const MOCK_SIGNALS = [
  { type: 'gold',  icon: '📈', ticker: 'BTC/USDT · CRIPTO',  message: 'Bitcoin consolida sobre soporte $95.200. RSI(14) en 48. Estructura alcista intacta.', time: 'hace 2 min',  confidence: 78 },
  { type: 'cyan',  icon: '📊', ticker: 'NVDA · BOLSA',        message: 'NVIDIA rompe resistencia en $142. Volumen +34% sobre media 20D. MACD histograma positivo.', time: 'hace 18 min', confidence: 84 },
  { type: 'green', icon: '💱', ticker: 'EUR/USD · FOREX',     message: 'Par en consolidación entre 1.0821-1.0868. RSI neutral en 51. Esperar confirmación de ruptura.', time: 'hace 45 min', confidence: 62 },
  { type: 'gold',  icon: '⚡', ticker: 'ETH/USDT · CRIPTO',   message: 'Ethereum testando resistencia en $3.240. Bollinger Superior actuando como techo. RSI en 66.', time: 'hace 1h',    confidence: 71 },
];

const TYPE_COLORS: Record<string, string> = { gold: 'var(--gold)', cyan: 'var(--cyan)', green: 'var(--green)' };

const CHANNEL_INFO: Record<string, { name: string; desc: string; color: string }> = {
  free:  { name: 'Sin acceso',         desc: 'Activa un plan para acceder al canal',       color: 'var(--muted)' },
  pro:   { name: '@XentoryMarketPro',  desc: 'Señales cripto + forex + bolsa en tiempo real', color: 'var(--cyan)'  },
  elite: { name: '@XentoryMarketElite',desc: 'Señales Pro + alertas anticipadas + análisis IA', color: 'var(--gold)' },
};

export function TelegramPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [conn,       setConn]       = useState<TelegramConnection | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [copied,     setCopied]     = useState(false);

  const isPaid  = user?.plan === 'pro' || user?.plan === 'elite';
  const channel = CHANNEL_INFO[user?.plan ?? 'free'];

  // ── Load connection status ──────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const code = generateVerifyCode(user.id, 'market');
    setVerifyCode(code);
    getTelegramConnection(user.id, 'market').then(c => {
      setConn(c);
      setLoading(false);
    });
  }, [user?.id]);

  // ── Poll after opening bot ───────────────────────────────────
  const pollConnection = () => {
    if (!user?.id) return;
    let tries = 0;
    const iv = setInterval(async () => {
      tries++;
      const c = await getTelegramConnection(user.id!, 'market');
      if (c) { setConn(c); clearInterval(iv); return; }
      if (tries >= 12) clearInterval(iv);
    }, 3000);
  };

  // ── Connect: save code → open bot ───────────────────────────
  const handleConnect = async () => {
    if (!isPaid) { navigate('/plans'); return; }
    if (!user)   return;
    setConnecting(true);
    try {
      await upsertVerifyCode(user.id, user.email, 'market', user.plan);
      window.open(`https://t.me/XentoryBot?start=${verifyCode}`, '_blank');
      pollConnection();
    } catch (e) { console.error(e); }
    finally { setConnecting(false); }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(verifyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 900, width: '100%' }}>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>✈️ Canal de Telegram</h1>
        <p style={{ color: 'var(--muted)' }}>Señales premium directo a tu Telegram. Acceso según tu plan.</p>
      </div>

      <div className="mkt-telegram-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>

        {/* Status card */}
        <div className="glass" style={{ borderRadius: 16, padding: '1.8rem' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>Estado de conexión</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Plan */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1rem', background: 'var(--card2)', borderRadius: 10 }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.2rem' }}>Plan activo</div>
                <div style={{ fontFamily: 'Urbanist', fontWeight: 700, color: isPaid ? 'var(--gold)' : 'var(--muted)' }}>
                  {user?.plan === 'free' ? 'Explorador' : user?.plan === 'pro' ? 'Pro ✓' : 'Elite ✓'}
                </div>
              </div>
              <div style={{ fontSize: '1.5rem' }}>{isPaid ? '✅' : '🔒'}</div>
            </div>

            {/* Canal asignado */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1rem', background: 'var(--card2)', borderRadius: 10 }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.2rem' }}>Canal asignado</div>
                <div style={{ fontFamily: 'Urbanist', fontWeight: 700, color: channel.color, fontSize: '0.85rem' }}>
                  {channel.name}
                </div>
              </div>
              <div style={{ fontSize: '1.5rem' }}>{isPaid ? '📡' : '❌'}</div>
            </div>

            {/* Telegram link */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1rem', background: 'var(--card2)', borderRadius: 10 }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.2rem' }}>Cuenta Telegram</div>
                <div style={{ fontFamily: 'Urbanist', fontWeight: 700, color: conn ? 'var(--green)' : 'var(--muted)', fontSize: '0.88rem' }}>
                  {loading ? '…' : conn ? (conn.telegram_username ? `@${conn.telegram_username}` : 'Vinculada ✓') : 'Sin vincular'}
                </div>
              </div>
              <div style={{ fontSize: '1.5rem' }}>{conn ? '🔗' : '⚠️'}</div>
            </div>
          </div>

          {/* CTA */}
          <div style={{ marginTop: '1.5rem' }}>
            {!isPaid ? (
              <button onClick={() => navigate('/plans')} className="btn btn-gold" style={{ width: '100%', justifyContent: 'center' }}>
                💎 Activar plan para acceder
              </button>
            ) : !conn ? (
              <button onClick={handleConnect} disabled={connecting} className="btn btn-gold" style={{ width: '100%', justifyContent: 'center' }}>
                {connecting ? '⏳ Abriendo…' : '🔗 Vincular Telegram'}
              </button>
            ) : (
              <a href={`https://t.me/${channel.name.replace('@','')}`} target="_blank" rel="noreferrer"
                className="btn btn-gold" style={{ display: 'flex', width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
                ✈️ Abrir canal en Telegram
              </a>
            )}
          </div>
        </div>

        {/* Setup guide */}
        <div className="glass" style={{ borderRadius: 16, padding: '1.8rem' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>Cómo conectar</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '1.5rem' }}>
            {[
              { num: '01', title: 'Activa un plan',      desc: 'Necesitas Plan Pro o Elite para acceder al canal de señales.' },
              { num: '02', title: 'Copia tu código',     desc: 'Tu código único aparece abajo. Cópialo con el botón.' },
              { num: '03', title: 'Abre el bot',         desc: 'Pulsa "Vincular Telegram" o busca @XentoryBot y envía tu código.' },
              { num: '04', title: 'Acceso instantáneo',  desc: 'El bot verifica tu plan y te añade al canal correspondiente al momento.' },
            ].map(step => (
              <div key={step.num} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gold-dim)', border: '1px solid rgba(201,168,76,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Urbanist', fontWeight: 700, fontSize: '0.7rem', color: 'var(--gold)', flexShrink: 0,
                }}>{step.num}</div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem', marginBottom: '0.2rem' }}>{step.title}</div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.5 }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Verification code */}
          {isPaid && (
            <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 12, padding: '1rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Tu código de verificación
              </div>
              <div className="mkt-verify-code" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.15rem', color: 'var(--gold)', letterSpacing: '0.1em' }}>
                  {verifyCode}
                </div>
                <button onClick={handleCopyCode} className="btn btn-gold btn-sm">
                  {copied ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                Envía este código al bot · Válido 24h · Se renueva automáticamente
              </div>
            </div>
          )}

          {/* Bot link */}
          <div style={{ marginTop: '0.8rem', padding: '0.9rem 1rem', background: 'var(--card2)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.2rem' }}>Bot oficial</div>
              <div style={{ fontFamily: 'Urbanist', fontWeight: 600, color: 'var(--cyan)', fontSize: '0.9rem' }}>@XentoryBot</div>
            </div>
            <a href="https://t.me/XentoryBot" target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>
              Abrir →
            </a>
          </div>
        </div>
      </div>

      {/* Signal preview */}
      <div className="glass" style={{ borderRadius: 16, padding: '1.8rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1rem', marginBottom: '0.2rem' }}>Preview de señales</h2>
            <div style={{ fontSize: '0.78rem', color: channel.color }}>{channel.name} — {channel.desc}</div>
          </div>
          {!isPaid && (
            <span style={{ padding: '0.2rem 0.7rem', borderRadius: 100, fontSize: '0.72rem', background: 'rgba(255,68,85,0.1)', color: 'var(--red)', border: '1px solid rgba(255,68,85,0.2)' }}>
              🔒 Solo Pro/Elite
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', filter: !isPaid ? 'blur(3px)' : 'none', userSelect: !isPaid ? 'none' : 'auto' }}>
          {MOCK_SIGNALS.map((sig, i) => (
            <div key={i} style={{ padding: '1rem 1.2rem', background: '#17212b', borderRadius: 12, borderLeft: `3px solid ${TYPE_COLORS[sig.type]}`, display: 'flex', gap: '1rem' }}>
              <div style={{ fontSize: '1.2rem', flexShrink: 0 }}>{sig.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '0.75rem', color: TYPE_COLORS[sig.type], marginBottom: '0.3rem', letterSpacing: '0.05em' }}>{sig.ticker}</div>
                <div style={{ fontSize: '0.83rem', lineHeight: 1.5, color: 'var(--text2)' }}>{sig.message}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{sig.time}</span>
                  <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.5rem', borderRadius: 100, background: `${TYPE_COLORS[sig.type]}15`, color: TYPE_COLORS[sig.type] }}>Confianza: {sig.confidence}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {!isPaid && (
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <p style={{ color: 'var(--muted)', marginBottom: '1rem', fontSize: '0.88rem' }}>Upgrade to Pro Plan to see real-time signals</p>
            <button onClick={() => navigate('/plans')} className="btn btn-gold">💎 Desbloquear señales</button>
          </div>
        )}
      </div>
    </div>
  );
}
