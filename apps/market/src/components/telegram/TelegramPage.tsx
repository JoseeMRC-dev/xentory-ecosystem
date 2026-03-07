import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const MOCK_SIGNALS = [
  { type: 'gold', icon: '📈', ticker: 'BTC/USDT · CRIPTO', message: 'Bitcoin consolida sobre soporte $95.200. RSI(14) en 48. Estructura alcista intacta. EMA20 como soporte dinámico.', time: 'hace 2 min', confidence: 78 },
  { type: 'cyan', icon: '📊', ticker: 'NVDA · BOLSA', message: 'NVIDIA rompe resistencia en $142. Volumen +34% sobre media 20D. MACD histograma positivo. Contexto sectorial favorable.', time: 'hace 18 min', confidence: 84 },
  { type: 'green', icon: '💱', ticker: 'EUR/USD · FOREX', message: 'Par en consolidación entre 1.0821-1.0868. RSI neutral en 51. Esperar confirmación de ruptura antes de cualquier posicionamiento.', time: 'hace 45 min', confidence: 62 },
  { type: 'gold', icon: '⚡', ticker: 'ETH/USDT · CRIPTO', message: 'Ethereum testando resistencia en $3.240. Bollinger Superior actuando como techo. RSI(14) en 66, zona de atención.', time: 'hace 1h 12min', confidence: 71 },
];

const TYPE_COLORS: Record<string, string> = {
  gold: 'var(--gold)',
  cyan: 'var(--cyan)',
  green: 'var(--green)',
};

export function TelegramPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linked, setLinked] = useState(user?.telegramLinked ?? false);

  const isPaid = user?.plan === 'pro' || user?.plan === 'elite';
  const channelLink = isPaid ? 'https://t.me/+xentory-market_pro_channel' : null;
  const botLink = 'https://t.me/Xentory MarketBot';

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLinkAccount = async () => {
    if (!isPaid) { navigate('/plans'); return; }
    setLinking(true);
    await new Promise(r => setTimeout(r, 1500));
    setLinked(true);
    setLinking(false);
  };

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 900, width: '100%' }}>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>✈️ Canal de Telegram</h1>
        <p style={{ color: 'var(--muted)' }}>Señales premium directo a tu Telegram. Acceso automático según tu plan.</p>
      </div>

      <div className="mkt-telegram-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>

        {/* Status */}
        <div className="glass" style={{ borderRadius: 16, padding: '1.8rem' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>Estado de conexión</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Plan status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1rem', background: 'var(--card2)', borderRadius: 10 }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.2rem' }}>Plan activo</div>
                <div style={{ fontFamily: 'Urbanist', fontWeight: 700, color: isPaid ? 'var(--gold)' : 'var(--muted)' }}>
                  {user?.plan === 'free' ? 'Explorador (Sin acceso)' : user?.plan === 'pro' ? 'Pro ✓' : 'Elite ✓'}
                </div>
              </div>
              <div style={{ fontSize: '1.5rem' }}>{isPaid ? '✅' : '🔒'}</div>
            </div>

            {/* Telegram link status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1rem', background: 'var(--card2)', borderRadius: 10 }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.2rem' }}>Cuenta Telegram</div>
                <div style={{ fontFamily: 'Urbanist', fontWeight: 700, color: linked ? 'var(--green)' : 'var(--muted)' }}>
                  {linked ? '@tu_usuario vinculado' : 'Sin vincular'}
                </div>
              </div>
              <div style={{ fontSize: '1.5rem' }}>{linked ? '🔗' : '⚠️'}</div>
            </div>

            {/* Canal access */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1rem', background: 'var(--card2)', borderRadius: 10 }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.2rem' }}>Acceso al canal</div>
                <div style={{ fontFamily: 'Urbanist', fontWeight: 700, color: linked && isPaid ? 'var(--green)' : 'var(--muted)' }}>
                  {linked && isPaid ? 'Activo' : 'Inactivo'}
                </div>
              </div>
              <div style={{ fontSize: '1.5rem' }}>{linked && isPaid ? '📡' : '❌'}</div>
            </div>
          </div>

          {/* CTA */}
          {!isPaid ? (
            <button onClick={() => navigate('/plans')} className="btn btn-gold" style={{ width: '100%', justifyContent: 'center', marginTop: '1.5rem' }}>
              💎 Activar plan para acceder
            </button>
          ) : !linked ? (
            <button onClick={handleLinkAccount} className="btn btn-gold" style={{ width: '100%', justifyContent: 'center', marginTop: '1.5rem' }} disabled={linking}>
              {linking ? <span className="animate-spin" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #050810', borderTopColor: 'transparent', borderRadius: '50%' }} /> : '🔗'}
              {linking ? 'Vinculando...' : 'Vincular cuenta Telegram'}
            </button>
          ) : (
            <a href={channelLink!} target="_blank" rel="noreferrer" className="btn btn-gold" style={{ display: 'flex', width: '100%', justifyContent: 'center', marginTop: '1.5rem', textDecoration: 'none' }}>
              ✈️ Abrir canal en Telegram
            </a>
          )}
        </div>

        {/* Setup guide */}
        <div className="glass" style={{ borderRadius: 16, padding: '1.8rem' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>Cómo funciona</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {[
              { num: '01', title: 'Activa tu plan', desc: 'Elige Pro o Elite para acceder al canal de señales premium.' },
              { num: '02', title: 'Vincula tu cuenta', desc: 'Conecta tu cuenta de Telegram con tu perfil de Xentory Market.' },
              { num: '03', title: 'Acceso automático', desc: 'El bot te añade al canal correspondiente a tu plan al instante.' },
              { num: '04', title: 'Señales en tiempo real', desc: 'Recibes alertas de cripto, bolsa y forex directamente en Telegram.' },
            ].map(step => (
              <div key={step.num} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--gold-dim)', border: '1px solid rgba(201,168,76,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Urbanist', fontWeight: 700, fontSize: '0.7rem',
                  color: 'var(--gold)', flexShrink: 0,
                }}>
                  {step.num}
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem', marginBottom: '0.2rem' }}>{step.title}</div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.5 }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Bot link */}
          <div style={{ marginTop: '1.5rem', padding: '0.9rem 1rem', background: 'var(--card2)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.2rem' }}>Nuestro bot</div>
              <div style={{ fontFamily: 'Urbanist', fontWeight: 600, color: 'var(--cyan)', fontSize: '0.9rem' }}>@Xentory MarketBot</div>
            </div>
            <button
              onClick={() => handleCopy(botLink)}
              className="btn btn-outline btn-sm"
            >
              {copied ? '✓ Copiado' : 'Copiar link'}
            </button>
          </div>
        </div>
      </div>

      {/* Signal preview */}
      <div className="glass" style={{ borderRadius: 16, padding: '1.8rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem' }}>Preview de señales recientes</h2>
          {!isPaid && (
            <span style={{
              padding: '0.2rem 0.7rem', borderRadius: 100, fontSize: '0.72rem',
              background: 'rgba(255,68,85,0.1)', color: 'var(--red)',
              border: '1px solid rgba(255,68,85,0.2)',
            }}>
              🔒 Solo plan Pro/Elite
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', filter: !isPaid ? 'blur(3px)' : 'none', userSelect: !isPaid ? 'none' : 'auto' }}>
          {MOCK_SIGNALS.map((sig, i) => (
            <div
              key={i}
              style={{
                padding: '1rem 1.2rem',
                background: '#17212b',
                borderRadius: 12,
                borderLeft: `3px solid ${TYPE_COLORS[sig.type]}`,
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start',
              }}
            >
              <div style={{ fontSize: '1.2rem', flexShrink: 0 }}>{sig.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.05em', color: TYPE_COLORS[sig.type], marginBottom: '0.3rem' }}>
                  {sig.ticker}
                </div>
                <div style={{ fontSize: '0.83rem', lineHeight: 1.5, color: 'var(--text2)' }}>{sig.message}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{sig.time}</span>
                  <span style={{
                    fontSize: '0.7rem', padding: '0.1rem 0.5rem', borderRadius: 100,
                    background: `${TYPE_COLORS[sig.type]}15`, color: TYPE_COLORS[sig.type],
                  }}>
                    Confianza: {sig.confidence}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!isPaid && (
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <p style={{ color: 'var(--muted)', marginBottom: '1rem', fontSize: '0.88rem' }}>
              Activa el Plan Pro para ver las señales en tiempo real y recibir notificaciones en Telegram
            </p>
            <button onClick={() => navigate('/plans')} className="btn btn-gold">
              💎 Desbloquear señales
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
