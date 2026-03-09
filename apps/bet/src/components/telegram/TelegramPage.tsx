import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  getTelegramConnection, upsertVerifyCode, generateVerifyCode,
  type TelegramConnection,
} from '../../services/alertService';

const MOCK_PICKS = [
  { sport: '⚽', match: 'Real Madrid vs Barcelona',  pick: 'Over 2.5 goles',   confidence: 74, odds: 1.72, tier: 'PRO',   time: 'hace 2h' },
  { sport: '🏀', match: 'Lakers vs Celtics',          pick: 'Lakers +5.5',      confidence: 68, odds: 1.91, tier: 'PRO',   time: 'hace 4h' },
  { sport: '🎾', match: 'Alcaraz vs Djokovic',        pick: 'Alcaraz gana',     confidence: 71, odds: 1.65, tier: 'ELITE', time: 'hace 6h' },
  { sport: '⚽', match: 'Man City vs Arsenal',        pick: 'BTTS Sí',          confidence: 69, odds: 1.80, tier: 'PRO',   time: 'ayer'    },
  { sport: '🏈', match: 'Chiefs vs Eagles',            pick: 'Under 48.5 pts',  confidence: 77, odds: 1.88, tier: 'ELITE', time: 'ayer'    },
];

const CHANNEL_INFO: Record<string, { name: string; desc: string; color: string }> = {
  free:  { name: 'Sin acceso',      desc: 'Activa un plan para acceder al canal',             color: 'var(--muted)' },
  pro:   { name: '@XentoryBetPro',  desc: 'Picks del día + estadísticas pre-partido',         color: 'var(--cyan)'  },
  elite: { name: '@XentoryBetElite',desc: 'Todo Pro + picks anticipados + análisis en vivo',  color: 'var(--gold)'  },
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

  useEffect(() => {
    if (!user?.id) return;
    const code = generateVerifyCode(user.id, 'bet');
    setVerifyCode(code);
    getTelegramConnection(user.id, 'bet').then(c => { setConn(c); setLoading(false); });
  }, [user?.id]);

  const pollConnection = () => {
    if (!user?.id) return;
    let tries = 0;
    const iv = setInterval(async () => {
      tries++;
      const c = await getTelegramConnection(user.id!, 'bet');
      if (c) { setConn(c); clearInterval(iv); return; }
      if (tries >= 12) clearInterval(iv);
    }, 3000);
  };

  const handleConnect = async () => {
    if (!isPaid) { navigate('/plans'); return; }
    if (!user)   return;
    setConnecting(true);
    try {
      await upsertVerifyCode(user.id, user.email, 'bet', user.plan);
      window.open(`https://t.me/XentoryBot?start=${verifyCode}`, '_blank');
      pollConnection();
    } catch (e) { console.error(e); }
    finally { setConnecting(false); }
  };

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 900, width: '100%' }}>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>✈️ Canal Telegram</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>Picks y señales de apuestas directamente en tu Telegram según tu plan.</p>
      </div>

      {/* Status grid */}
      <div className="bet-tg-status-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Plan activo',    value: user?.plan === 'free' ? 'Fanático' : user?.plan?.toUpperCase() ?? 'free', color: isPaid ? 'var(--gold)' : 'var(--muted)' },
          { label: 'Canal asignado', value: isPaid ? channel.name : 'No incluido', color: isPaid ? 'var(--cyan)' : 'var(--muted)' },
          { label: 'Estado',         value: loading ? '…' : conn ? '● Vinculado' : isPaid ? '● Pendiente' : '● Inactivo', color: conn ? 'var(--green)' : 'var(--muted)' },
        ].map(item => (
          <div key={item.label} className="glass" style={{ borderRadius: 12, padding: '1.1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{item.label}</div>
            <div style={{ fontFamily: 'Urbanist', fontWeight: 700, color: item.color, fontSize: '0.9rem' }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div className="bet-tg-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

        {/* Connection card */}
        <div className="glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '1.2rem' }}>Vincular cuenta</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.2rem' }}>
            {[
              { num: '01', text: `Necesitas Plan Pro o Elite` },
              { num: '02', text: 'Copia tu código de verificación' },
              { num: '03', text: 'Pulsa "Vincular" — se abrirá el bot' },
              { num: '04', text: 'El bot te añade al canal de tu plan' },
            ].map(s => (
              <div key={s.num} style={{ display: 'flex', gap: '0.7rem', alignItems: 'flex-start' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--gold-dim)', border: '1px solid rgba(201,168,76,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'var(--gold)', flexShrink: 0 }}>
                  {s.num}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text2)', paddingTop: '0.3rem' }}>{s.text}</div>
              </div>
            ))}
          </div>

          {/* Verify code */}
          {isPaid && (
            <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, padding: '0.9rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Tu código</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1rem', color: 'var(--gold)', letterSpacing: '0.1em' }}>{verifyCode}</span>
                <button onClick={() => { navigator.clipboard.writeText(verifyCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="btn btn-gold btn-sm">{copied ? '✓ Copiado' : 'Copiar'}</button>
              </div>
            </div>
          )}

          {/* CTA */}
          {!isPaid ? (
            <button onClick={() => navigate('/plans')} className="btn btn-gold" style={{ width: '100%', justifyContent: 'center' }}>
              💎 Activar plan
            </button>
          ) : !conn ? (
            <button onClick={handleConnect} disabled={connecting} className="btn btn-gold" style={{ width: '100%', justifyContent: 'center' }}>
              {connecting ? '⏳ Abriendo bot…' : '🔗 Vincular Telegram'}
            </button>
          ) : (
            <a href={`https://t.me/${channel.name.replace('@','')}`} target="_blank" rel="noreferrer"
              className="btn btn-gold" style={{ display: 'flex', width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
              ✈️ Ir al canal
            </a>
          )}

          {conn && (
            <div style={{ marginTop: '0.8rem', padding: '0.6rem 0.8rem', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 8, fontSize: '0.78rem', color: 'var(--green)', textAlign: 'center' }}>
              ✓ Telegram vinculado · {conn.telegram_username ? `@${conn.telegram_username}` : 'Cuenta verificada'}
            </div>
          )}
        </div>

        {/* Channel info */}
        <div className="glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '1.2rem' }}>Canales disponibles</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {[
              { plan: 'pro',   icon: '📊', name: '@XentoryBetPro',  color: 'var(--cyan)', features: ['Picks del día (todos los deportes)', 'Estadísticas pre-partido', 'Análisis de valor', 'Historial de resultados'] },
              { plan: 'elite', icon: '👑', name: '@XentoryBetElite', color: 'var(--gold)', features: ['Todo lo de Pro', 'Picks anticipados (24h antes)', 'Análisis en vivo', 'Acceso prioritario'] },
            ].map(ch => (
              <div key={ch.plan} style={{ padding: '1rem', borderRadius: 12, background: 'var(--card2)',
                border: user?.plan === ch.plan ? `1px solid ${ch.color}50` : '1px solid var(--border)',
                opacity: user?.plan === ch.plan || user?.plan === 'elite' ? 1 : 0.5,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>{ch.icon}</span>
                  <span style={{ fontFamily: 'Urbanist', fontWeight: 700, color: ch.color, fontSize: '0.88rem' }}>{ch.name}</span>
                  {user?.plan === ch.plan && <span style={{ marginLeft: 'auto', fontSize: '0.68rem', padding: '0.1rem 0.4rem', borderRadius: 100, background: `${ch.color}20`, color: ch.color, border: `1px solid ${ch.color}40` }}>Tu plan</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {ch.features.map(f => (
                    <div key={f} style={{ fontSize: '0.78rem', color: 'var(--text2)', display: 'flex', gap: '0.4rem' }}>
                      <span style={{ color: ch.color }}>✓</span>{f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Picks preview */}
      <div className="glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <h2 style={{ fontSize: '1rem' }}>Preview de picks recientes</h2>
          {!isPaid && <span style={{ padding: '0.2rem 0.7rem', borderRadius: 100, fontSize: '0.72rem', background: 'rgba(255,68,85,0.1)', color: 'var(--red)', border: '1px solid rgba(255,68,85,0.2)' }}>🔒 Pro/Elite</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', filter: !isPaid ? 'blur(3px)' : 'none', userSelect: !isPaid ? 'none' : 'auto' }}>
          {MOCK_PICKS.map((p, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', alignItems: 'center', gap: '0.8rem',
              padding: '0.8rem 1rem', background: 'var(--card2)', borderRadius: 10,
              borderLeft: `3px solid ${p.tier === 'ELITE' ? 'var(--gold)' : 'var(--cyan)'}`,
            }}>
              <span style={{ fontSize: '1.1rem' }}>{p.sport}</span>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{p.match}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{p.pick}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Conf.</div>
                <div style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '0.85rem', color: p.confidence >= 70 ? 'var(--green)' : 'var(--gold)' }}>{p.confidence}%</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Cuota</div>
                <div style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '0.85rem' }}>{p.odds}</div>
              </div>
              <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: 100, background: p.tier === 'ELITE' ? 'rgba(201,168,76,0.1)' : 'rgba(77,159,255,0.1)', color: p.tier === 'ELITE' ? 'var(--gold)' : 'var(--cyan)', border: `1px solid ${p.tier === 'ELITE' ? 'rgba(201,168,76,0.25)' : 'rgba(77,159,255,0.25)'}` }}>{p.tier}</span>
            </div>
          ))}
        </div>
        {!isPaid && (
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <p style={{ color: 'var(--muted)', marginBottom: '1rem', fontSize: '0.88rem' }}>Activa el Plan Pro para acceder a los picks en tiempo real</p>
            <button onClick={() => navigate('/plans')} className="btn btn-gold">💎 Ver planes</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── HISTORY PAGE ─────────────────────────────────────────────────────────
export function HistoryPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 'calc(var(--bar-h, 52px) + 1.5rem) clamp(1rem, 4vw, 2rem) 3rem' }}>
      <h1 style={{ fontSize: 'clamp(1.2rem, 4vw, 1.6rem)', marginBottom: '0.4rem' }}>
        📋 Historial de Análisis
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '2rem' }}>
        Revisa todos los análisis y predicciones generados anteriormente.
      </p>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🏆</div>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          El historial de análisis estará disponible próximamente.<br />
          Aquí podrás ver todos tus análisis guardados y su rendimiento.
        </p>
      </div>
    </div>
  );
}
