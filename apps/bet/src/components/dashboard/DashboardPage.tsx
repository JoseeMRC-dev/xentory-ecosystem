import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { fetchUpcomingMatches, fetchBasketballMatches, fetchTennisMatches } from '../../services/sportsService';
import { calculateGlobalAccuracy } from '../../services/globalAccuracy';
import { getTelegramConnection } from '../../services/alertService';
import { logActivity, getRecentActivity } from '../../services/activityStore';
import type { Activity } from '../../services/activityStore';
import { SPORT_CONFIG, confidenceColor } from '../../constants';
import { useLang } from '../../context/LanguageContext';
import type { Match } from '../../types';

// Football competitions for the slider
const FOOTBALL_COMPETITIONS = [
  { id: 'champions', emoji: '⭐', name: 'Champions League', shortName: 'UCL', color: '#1a56db' },
  { id: 'laliga',    emoji: '🇪🇸', name: 'La Liga',          shortName: 'LaLiga', color: '#c9a84c' },
  { id: 'premier',   emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', name: 'Premier League',  shortName: 'EPL', color: '#3d0099' },
  { id: 'seriea',    emoji: '🇮🇹', name: 'Serie A',           shortName: 'SerieA', color: '#006dac' },
  { id: 'bundesliga',emoji: '🇩🇪', name: 'Bundesliga',        shortName: 'BL', color: '#e30613' },
  { id: 'ligue1',    emoji: '🇫🇷', name: 'Ligue 1',           shortName: 'L1', color: '#0033a0' },
  { id: 'mls',       emoji: '🇺🇸', name: 'MLS',               shortName: 'MLS', color: '#002b5c' },
  { id: 'libertadores', emoji: '🌎', name: 'Copa Libertadores', shortName: 'Lib', color: '#00a651' },
];

type DayPick = { sport: string; match: string; competition: string; pick: string; confidence: number; odds: number; market: string; matchId: number; matchRef: Match; };

function buildPick(m: Match | undefined, lang: string): DayPick | null {
  if (!m) return null;
  const seed = ((m.id % 97) + 97) % 97;
  const confidence = 62 + (seed % 18);
  const base = { matchId: m.id, matchRef: m };
  if (m.sport === 'football') {
    return { ...base, sport: '⚽', match: `${m.homeTeam.name} vs ${m.awayTeam.name}`, competition: m.competition.name, pick: lang === 'es' ? `${m.homeTeam.shortName} gana` : `${m.homeTeam.shortName} wins`, confidence, odds: parseFloat((1.50 + (seed % 60) / 100).toFixed(2)), market: '1X2' };
  }
  if (m.sport === 'basketball') {
    return { ...base, sport: '🏀', match: `${m.homeTeam.shortName} vs ${m.awayTeam.shortName}`, competition: m.competition.name, pick: `Over ${210 + (seed % 25)}.5`, confidence, odds: parseFloat((1.80 + (seed % 20) / 100).toFixed(2)), market: 'Over/Under' };
  }
  if (m.sport === 'tennis') {
    return { ...base, sport: '🎾', match: `${m.homeTeam.name} vs ${m.awayTeam.name}`, competition: m.competition.name, pick: lang === 'es' ? `${m.homeTeam.shortName} gana` : `${m.homeTeam.shortName} wins`, confidence, odds: parseFloat((1.45 + (seed % 55) / 100).toFixed(2)), market: lang === 'es' ? 'Resultado' : 'Result' };
  }
  return null;
}

function StatCard({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) {
  return (
    <div className="glass" style={{ borderRadius: 14, padding: '1.4rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', fontSize: '1.4rem', opacity: 0.4 }}>{icon}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>{label}</div>
      <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '2rem', color, letterSpacing: '-0.04em' }}>{value}</div>
    </div>
  );
}

function timeAgo(ts: number, lang: string): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return lang === 'es' ? 'Ahora mismo' : 'Just now';
  if (diff < 3600) { const m = Math.floor(diff / 60); return lang === 'es' ? `Hace ${m} min` : `${m}m ago`; }
  if (diff < 86400) { const h = Math.floor(diff / 3600); return lang === 'es' ? `Hace ${h}h` : `${h}h ago`; }
  const d = Math.floor(diff / 86400);
  return lang === 'es' ? `Hace ${d}d` : `${d}d ago`;
}

const ACTIVITY_ICONS: Record<string, string> = {
  analysis: '🧠',
  match_view: '👁️',
  pick: '🎯',
};

const ACTIVITY_LABELS: Record<string, { es: string; en: string }> = {
  analysis: { es: 'Análisis generado', en: 'Analysis generated' },
  match_view: { es: 'Partido visto', en: 'Match viewed' },
  pick: { es: 'Pick guardado', en: 'Pick saved' },
};

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, lang } = useLang();
  // Pre-populate with mock data so the UI renders immediately
  const [upcomingMatches, setUpcomingMatches] = useState<Match[] | null>(null);
  const [todayPicks, setTodayPicks] = useState<DayPick[]>([]);
  const [weeklyAcc, setWeeklyAcc] = useState<number | null>(null);
  const [tgLinked, setTgLinked] = useState<boolean | null>(null); // null = loading
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);

  useEffect(() => {
    let cancelled = false;

    // Fútbol: LaLiga tiene prioridad; el resto rellena hasta 5
    Promise.all([
      fetchUpcomingMatches(140, 5), // LaLiga — prioridad máxima
      fetchUpcomingMatches(2, 3),   // UCL
      fetchUpcomingMatches(39, 3),  // Premier League
      fetchUpcomingMatches(78, 2),  // Bundesliga
      fetchUpcomingMatches(135, 2), // Serie A
    ]).then(([ll, cl, epl, bl, sa]) => {
        if (cancelled) return;
        const now = Date.now();
        // Only matches not yet played and with a future (or live) date
        const upcoming = (ms: Match[]) => ms.filter(m =>
          m.status !== 'finished' && (m.status === 'live' || new Date(m.date).getTime() >= now - 3_600_000)
        );
        // Slots 1-3 guaranteed for LaLiga; rest filled by other leagues sorted by date
        const laliga   = upcoming(ll).slice(0, 3);
        const others   = [...upcoming(cl), ...upcoming(epl), ...upcoming(bl), ...upcoming(sa)]
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const combined = [...laliga, ...others.filter(m => !laliga.find(l => l.id === m.id))];
        setUpcomingMatches(combined.slice(0, 5));
        const pick = buildPick(laliga[0] ?? others[0], lang);
        if (pick) setTodayPicks(prev => [pick, ...prev.filter(p => p.sport !== '⚽')]);
      });

    fetchBasketballMatches().then(m => {
      if (!cancelled && m[0]) { const p = buildPick(m[0], lang); if (p) setTodayPicks(prev => [...prev.filter(x => x.sport !== '🏀'), p]); }
    });

    fetchTennisMatches().then(m => {
      if (!cancelled && m[0]) { const p = buildPick(m[0], lang); if (p) setTodayPicks(prev => [...prev.filter(x => x.sport !== '🎾'), p]); }
    });

    calculateGlobalAccuracy().then(r => {
      if (!cancelled && r.percent !== null) setWeeklyAcc(r.percent);
    });

    if (user?.id) {
      getTelegramConnection(user.id, 'bet').then(conn => {
        if (!cancelled) setTgLinked(conn !== null);
      });
    }

    return () => { cancelled = true; };
  }, [lang]);

  // Load recent activity on mount and whenever window is focused (user returns from analysis)
  useEffect(() => {
    const refresh = () => setRecentActivity(getRecentActivity(8));
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  const hour = new Date().getHours();
  const greeting = lang === 'es'
    ? (hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches')
    : (hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening');

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 1100, width: '100%' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>
          {greeting}, <span className="text-gradient-gold">{user?.name.split(' ')[0]}</span> 👋
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{t('Aquí tienes las mejores predicciones del día generadas por IA.', 'Here are the best AI-generated predictions for today.')}</p>
      </div>

      {/* Stats */}
      <div className="bet-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard icon="🎯" value={String(todayPicks.length || '—')} label={t('Picks del día', "Today's picks")} color="var(--gold)" />
        <StatCard icon="" value={weeklyAcc !== null ? `${weeklyAcc}%` : '—'} label={t('Acierto semanal', 'Weekly accuracy')} color="var(--green)" />
        <StatCard icon="" value="5" label={t('Deportes activos', 'Active sports')} color="var(--cyan)" />
        {/* Telegram card — reflects real connection state */}
        <div
          className="glass"
          onClick={() => navigate(user?.plan === 'free' ? '/plans' : '/telegram')}
          style={{ borderRadius: 14, padding: '1.4rem', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '')}
        >
          <div style={{ position: 'absolute', top: '1rem', right: '1rem', fontSize: '1.4rem', opacity: 0.4 }}>✈️</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>{t('Canal Telegram', 'Telegram channel')}</div>
          {user?.plan === 'free' ? (
            // Free plan: prompt to upgrade
            <>
              <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.4rem', color: 'var(--muted)', letterSpacing: '-0.03em', marginBottom: '0.35rem' }}>{t('No incluido', 'Not included')}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: 'var(--gold)', fontWeight: 600 }}>
                💎 {t('Mejorar plan →', 'Upgrade plan →')}
              </div>
            </>
          ) : tgLinked === null ? (
            // Loading
            <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '2rem', color: 'var(--muted)', letterSpacing: '-0.04em' }}>…</div>
          ) : tgLinked ? (
            // Linked
            <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '2rem', color: 'var(--green)', letterSpacing: '-0.04em' }}>{t('Activo', 'Active')}</div>
          ) : (
            // Paid plan but not yet linked
            <>
              <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.6rem', color: 'var(--gold)', letterSpacing: '-0.04em', marginBottom: '0.3rem' }}>{t('Pendiente', 'Pending')}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{t('Vincular →', 'Link →')}</div>
            </>
          )}
        </div>
      </div>

      {/* Best bets of the day */}
      <div className="bet-dash-main-grid" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

        <div className="glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h2 style={{ fontSize: '1rem' }}>🎯 {t('Mejores picks del día', "Best picks of the day")}</h2>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span className="live-dot" /> {t('Actualizado hoy', 'Updated today')}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {todayPicks.length === 0
              ? Array(3).fill(0).map((_, i) => (
                  <div key={i} style={{ height: 64, borderRadius: 12, background: 'var(--card2)' }} className="skeleton" />
                ))
              : null}
            {todayPicks.map((pick, i) => (
              <div
                key={i}
                onClick={() => {
                  logActivity({ type: 'match_view', sport: pick.sport, title: pick.match, subtitle: pick.competition });
                  setRecentActivity(getRecentActivity(8));
                  navigate(`/matches/${pick.matchId}`, { state: { match: pick.matchRef } });
                }}
                style={{
                  padding: '1rem 1.2rem',
                  background: 'var(--card2)', borderRadius: 12,
                  border: '1px solid var(--border)',
                  cursor: 'pointer', transition: 'border-color 0.2s',
                  display: 'flex', gap: '1rem', alignItems: 'center',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>{pick.sport}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.88rem', marginBottom: '0.15rem' }}>{pick.match}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{pick.competition} · {pick.market}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.88rem', color: confidenceColor(pick.confidence) }}>
                    {pick.confidence}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gold)' }}>@{pick.odds}</div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => navigate('/analysis')} className="btn btn-gold" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>
            🧠 {t('Generar análisis completo', 'Generate full analysis')}
          </button>
        </div>

        {/* Upcoming matches */}
        <div className="glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h2 style={{ fontSize: '1rem' }}>📅 {t('Próximos partidos', 'Upcoming matches')}</h2>
            <button onClick={() => navigate('/matches')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', fontSize: '0.78rem' }}>{t('Ver todos', 'View all')} →</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {upcomingMatches === null
              ? Array(4).fill(0).map((_, i) => (
                  <div key={i} style={{ height: 56, borderRadius: 10, background: 'var(--card2)' }} className="skeleton" />
                ))
              : upcomingMatches.slice(0, 5).map(match => (
                  <div
                    key={match.id}
                    onClick={() => {
                      logActivity({ type: 'match_view', sport: match.competition.emoji ?? SPORT_CONFIG[match.sport]?.emoji ?? '⚽', title: `${match.homeTeam.name} vs ${match.awayTeam.name}`, subtitle: match.competition.name });
                      setRecentActivity(getRecentActivity(8));
                      navigate(`/matches/${match.id}`, { state: { match } });
                    }}
                    style={{
                      padding: '0.7rem 0.9rem', background: 'var(--card2)',
                      borderRadius: 10, cursor: 'pointer',
                      border: '1px solid var(--border)', transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>
                        {match.homeTeam.shortName} vs {match.awayTeam.shortName}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textAlign: 'right' }}>
                        <div>{new Date(match.date).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'Europe/Madrid' })}</div>
                        <div>{new Date(match.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' })}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                      {match.competition.emoji} {match.competition.name}
                    </div>
                  </div>
                ))
            }
          </div>
        </div>
      </div>

      {/* ── Actividad reciente ───────────────────────────────── */}
      <div className="glass" style={{ borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem' }}>🕐 {t('Actividad reciente', 'Recent activity')}</h2>
        </div>

        {recentActivity.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.4 }}>📭</div>
            {t('Aquí aparecerá tu actividad. Empieza analizando un partido.', 'Your activity will appear here. Start by analysing a match.')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recentActivity.map(act => (
              <div
                key={act.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.9rem',
                  padding: '0.7rem 0.9rem', borderRadius: 10,
                  background: 'var(--card2)', border: '1px solid var(--border)',
                }}
              >
                {/* sport + action icon */}
                <div style={{ position: 'relative', flexShrink: 0, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', background: 'var(--bg)', borderRadius: 8 }}>
                  {act.sport}
                  <span style={{ position: 'absolute', bottom: -2, right: -4, fontSize: '0.7rem' }}>
                    {ACTIVITY_ICONS[act.type]}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {act.title}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.1rem' }}>
                    {act.subtitle} · {ACTIVITY_LABELS[act.type]?.[lang as 'es' | 'en'] ?? act.type}
                  </div>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', flexShrink: 0 }}>
                  {timeAgo(act.ts, lang)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Football competitions slider ─────────────────────── */}
      <div className="glass" style={{ borderRadius: 16, padding: '1.2rem 1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>⚽ {t('Competiciones de fútbol', 'Football competitions')}</h2>
        <div className="bet-competitions-slider">
          {FOOTBALL_COMPETITIONS.map(comp => (
            <button
              key={comp.id}
              onClick={() => navigate(`/matches?sport=football&competition=${comp.id}`)}
              style={{
                flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: 100,
                background: 'var(--card2)',
                border: `1px solid var(--border)`,
                cursor: 'pointer', transition: 'all 0.18s',
                fontSize: '0.8rem', color: 'var(--text2)',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = comp.color;
                e.currentTarget.style.color = comp.color;
                e.currentTarget.style.background = `${comp.color}12`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text2)';
                e.currentTarget.style.background = 'var(--card2)';
              }}
            >
              <span style={{ fontSize: '0.9rem' }}>{comp.emoji}</span>
              <span>{comp.shortName}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sport quick access */}
      <div className="glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>🏆 {t('Acceso rápido por deporte', 'Quick access by sport')}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.5rem' }}>
          {Object.entries(SPORT_CONFIG).map(([key, cfg]) => (
            <div
              key={key}
              onClick={() => navigate(`/matches?sport=${key}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.65rem 0.9rem', borderRadius: 10,
                background: 'var(--card2)', border: '1px solid var(--border)',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = cfg.color; e.currentTarget.style.background = `${cfg.color}10`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--card2)'; }}
            >
              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{cfg.emoji}</span>
              <span style={{ fontSize: '0.83rem', color: 'var(--text2)', fontWeight: 500 }}>{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Upgrade banner */}
      {user?.plan === 'free' && (
        <div
          onClick={() => navigate('/plans')}
          className="bet-upgrade-banner"
          style={{
            marginTop: '1.5rem', padding: '1.2rem 1.5rem',
            background: 'linear-gradient(135deg, rgba(201,168,76,0.08), rgba(0,255,136,0.05))',
            border: '1px solid rgba(201,168,76,0.2)', borderRadius: 14,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
          }}
        >
          <div>
            <div style={{ fontFamily: 'Outfit', fontWeight: 700, marginBottom: '0.2rem' }}>
              🚀 {t('Upgrade a Plan Pro — Análisis completo en todos los deportes', 'Upgrade to Pro Plan — Full analysis across all sports')}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
              {t('Over/Under · BTTS · Hándicap · Canal Telegram · Todos los deportes desde 29€/mes', 'Over/Under · BTTS · Handicap · Telegram channel · All sports from €29/month')}
            </div>
          </div>
          <button className="btn btn-gold" style={{ flexShrink: 0, marginLeft: '1rem' }}>{t('Ver planes', 'View plans')} →</button>
        </div>
      )}
    </div>
  );
}
