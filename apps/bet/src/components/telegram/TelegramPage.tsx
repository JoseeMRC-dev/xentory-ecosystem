import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLang } from '../../context/LanguageContext';
import {
  getTelegramConnection, upsertVerifyCode, generateVerifyCode,
  type TelegramConnection,
} from '../../services/alertService';

const CHANNEL_INFO: Record<string, { name: string; color: string }> = {
  free:  { name: 'Sin acceso',       color: 'var(--muted)' },
  pro:   { name: '@XentoryBetPro',   color: 'var(--cyan)'  },
  elite: { name: '@XentoryBetElite', color: 'var(--gold)'  },
};

export function TelegramPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const { t }      = useLang();

  const [conn,       setConn]       = useState<TelegramConnection | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [copied,     setCopied]     = useState(false);

  const isPaid  = user?.plan === 'pro' || user?.plan === 'elite';
  const channel = CHANNEL_INFO[user?.plan ?? 'free'];

  const MOCK_PICKS = [
    { sport: '⚽', match: 'Real Madrid vs Barcelona',  pick: t('Over 2.5 goles','Over 2.5 goals'),   confidence: 74, odds: 1.72, tier: 'PRO',   time: t('hace 2h','2h ago') },
    { sport: '🏀', match: 'Lakers vs Celtics',          pick: 'Lakers +5.5',                          confidence: 68, odds: 1.91, tier: 'PRO',   time: t('hace 4h','4h ago') },
    { sport: '🎾', match: 'Alcaraz vs Djokovic',        pick: t('Alcaraz gana','Alcaraz wins'),       confidence: 71, odds: 1.65, tier: 'ELITE', time: t('hace 6h','6h ago') },
    { sport: '⚽', match: 'Man City vs Arsenal',        pick: t('BTTS Sí','BTTS Yes'),                confidence: 69, odds: 1.80, tier: 'PRO',   time: t('ayer','yesterday')  },
    { sport: '🏈', match: 'Chiefs vs Eagles',            pick: 'Under 48.5 pts',                       confidence: 77, odds: 1.88, tier: 'ELITE', time: t('ayer','yesterday')  },
  ];

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
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>✈️ {t('Canal Telegram', 'Telegram Channel')}</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>{t('Picks y señales de apuestas directamente en tu Telegram según tu plan.', 'Betting picks and signals delivered directly to your Telegram based on your plan.')}</p>
      </div>

      <div className="bet-tg-status-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: t('Plan activo', 'Active plan'),    value: user?.plan === 'free' ? t('Fanático','Fan') : user?.plan?.toUpperCase() ?? 'free', color: isPaid ? 'var(--gold)' : 'var(--muted)' },
          { label: t('Canal asignado', 'Assigned channel'), value: isPaid ? channel.name : t('No incluido','Not included'), color: isPaid ? 'var(--cyan)' : 'var(--muted)' },
          { label: t('Estado', 'Status'),              value: loading ? '…' : conn ? `● ${t('Vinculado','Linked')}` : isPaid ? `● ${t('Pendiente','Pending')}` : `● ${t('Inactivo','Inactive')}`, color: conn ? 'var(--green)' : 'var(--muted)' },
        ].map(item => (
          <div key={item.label} className="glass" style={{ borderRadius: 12, padding: '1.1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{item.label}</div>
            <div style={{ fontFamily: 'Outfit', fontWeight: 700, color: item.color, fontSize: '0.9rem' }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div className="bet-tg-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

        <div className="glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '1.2rem' }}>{t('Vincular cuenta', 'Link account')}</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.2rem' }}>
            {[
              { num: '01', text: t('Necesitas Plan Pro o Elite', 'You need Pro or Elite Plan') },
              { num: '02', text: t('Copia tu código de verificación', 'Copy your verification code') },
              { num: '03', text: t('Pulsa "Vincular" — se abrirá el bot', 'Press "Link" — the bot will open') },
              { num: '04', text: t('El bot te añade al canal de tu plan', 'The bot adds you to your plan channel') },
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

          {isPaid && (
            <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, padding: '0.9rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{t('Tu código', 'Your code')}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1rem', color: 'var(--gold)', letterSpacing: '0.1em' }}>{verifyCode}</span>
                <button onClick={() => { navigator.clipboard.writeText(verifyCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="btn btn-gold btn-sm">{copied ? `✓ ${t('Copiado','Copied')}` : t('Copiar','Copy')}</button>
              </div>
            </div>
          )}

          {!isPaid ? (
            <button onClick={() => navigate('/plans')} className="btn btn-gold" style={{ width: '100%', justifyContent: 'center' }}>
              💎 {t('Activar plan', 'Activate plan')}
            </button>
          ) : !conn ? (
            <button onClick={handleConnect} disabled={connecting} className="btn btn-gold" style={{ width: '100%', justifyContent: 'center' }}>
              {connecting ? `⏳ ${t('Abriendo bot…','Opening bot…')}` : `🔗 ${t('Vincular Telegram','Link Telegram')}`}
            </button>
          ) : (
            <a href={`https://t.me/${channel.name.replace('@','')}`} target="_blank" rel="noreferrer"
              className="btn btn-gold" style={{ display: 'flex', width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
              ✈️ {t('Ir al canal', 'Go to channel')}
            </a>
          )}

          {conn && (
            <div style={{ marginTop: '0.8rem', padding: '0.6rem 0.8rem', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 8, fontSize: '0.78rem', color: 'var(--green)', textAlign: 'center' }}>
              ✓ {t('Telegram vinculado', 'Telegram linked')} · {conn.telegram_username ? `@${conn.telegram_username}` : t('Cuenta verificada','Account verified')}
            </div>
          )}
        </div>

        <div className="glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '1.2rem' }}>{t('Canales disponibles', 'Available channels')}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {[
              { plan: 'pro',   icon: '📊', name: '@XentoryBetPro',  color: 'var(--cyan)', features: [
                t('Picks diarios (todos los deportes)', 'Daily picks (all sports)'),
                t('Estadísticas pre-partido', 'Pre-match statistics'),
                t('Análisis de valor', 'Value analysis'),
                t('Historial de resultados', 'Results history'),
              ]},
              { plan: 'elite', icon: '👑', name: '@XentoryBetElite', color: 'var(--gold)', features: [
                t('Todo en Pro', 'Everything in Pro'),
                t('Picks anticipados (24h antes)', 'Early picks (24h ahead)'),
                t('Análisis en vivo', 'Live analysis'),
                t('Acceso prioritario', 'Priority access'),
              ]},
            ].map(ch => (
              <div key={ch.plan} style={{ padding: '1rem', borderRadius: 12, background: 'var(--card2)',
                border: user?.plan === ch.plan ? `1px solid ${ch.color}50` : '1px solid var(--border)',
                opacity: user?.plan === ch.plan || user?.plan === 'elite' ? 1 : 0.5,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>{ch.icon}</span>
                  <span style={{ fontFamily: 'Outfit', fontWeight: 700, color: ch.color, fontSize: '0.88rem' }}>{ch.name}</span>
                  {user?.plan === ch.plan && <span style={{ marginLeft: 'auto', fontSize: '0.68rem', padding: '0.1rem 0.4rem', borderRadius: 100, background: `${ch.color}20`, color: ch.color, border: `1px solid ${ch.color}40` }}>{t('Tu plan','Your plan')}</span>}
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

      <div className="glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <h2 style={{ fontSize: '1rem' }}>{t('Preview de picks recientes', 'Recent picks preview')}</h2>
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
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{t('Conf.','Conf.')}</div>
                <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.85rem', color: p.confidence >= 70 ? 'var(--green)' : 'var(--gold)' }}>{p.confidence}%</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{t('Cuota','Odds')}</div>
                <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.85rem' }}>{p.odds}</div>
              </div>
              <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: 100, background: p.tier === 'ELITE' ? 'rgba(201,168,76,0.1)' : 'rgba(77,159,255,0.1)', color: p.tier === 'ELITE' ? 'var(--gold)' : 'var(--cyan)', border: `1px solid ${p.tier === 'ELITE' ? 'rgba(201,168,76,0.25)' : 'rgba(77,159,255,0.25)'}` }}>{p.tier}</span>
            </div>
          ))}
        </div>
        {!isPaid && (
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <p style={{ color: 'var(--muted)', marginBottom: '1rem', fontSize: '0.88rem' }}>{t('Actualiza a Plan Pro para acceder a picks en tiempo real', 'Upgrade to Pro Plan to access real-time picks')}</p>
            <button onClick={() => navigate('/plans')} className="btn btn-gold">💎 {t('Ver planes', 'View plans')}</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function HistoryPage() {
  const { t } = useLang();
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 'calc(var(--bar-h, 52px) + 1.5rem) clamp(1rem, 4vw, 2rem) 3rem' }}>
      <h1 style={{ fontSize: 'clamp(1.2rem, 4vw, 1.6rem)', marginBottom: '0.4rem' }}>
        📋 {t('Historial de Análisis', 'Analysis History')}
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '2rem' }}>
        {t('Revisa todos los análisis y predicciones generados anteriormente.', 'Review all previously generated analyses and predictions.')}
      </p>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🏆</div>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          {t(
            'El historial de análisis estará disponible próximamente. Aquí podrás ver todos tus análisis guardados y su rendimiento.',
            'Analysis history will be available soon. Here you will be able to see all your saved analyses and their performance.'
          )}
        </p>
      </div>
    </div>
  );
}
