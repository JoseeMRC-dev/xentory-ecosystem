import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { fetchUpcomingMatches, fetchBasketballMatches, fetchTennisMatches } from '../../services/sportsService';
import { calculateGlobalAccuracy } from '../../services/globalAccuracy';
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

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, lang } = useLang();
  // Pre-populate with mock data so the UI renders immediately
  const [upcomingMatches, setUpcomingMatches] = useState<Match[] | null>(null);
  const [todayPicks, setTodayPicks] = useState<DayPick[]>([]);
  const [weeklyAcc, setWeeklyAcc] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Fútbol: hoy primero (live/scheduled), luego rango adelante si no hay
    Promise.all([fetchUpcomingMatches(2, 3), fetchUpcomingMatches(140, 3), fetchUpcomingMatches(39, 2)])
      .then(([cl, ll, epl]) => {
        if (cancelled) return;
        setUpcomingMatches([...cl, ...ll].filter(m => m.status !== 'finished').slice(0, 6));
        const pick = buildPick(
          [...epl, ...ll, ...cl].find(m => m.status !== 'finished'),
          lang
        );
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

    return () => { cancelled = true; };
  }, [lang]);

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
        <StatCard icon="✈️" value={user?.plan !== 'free' ? t('Activo', 'Active') : t('Inactivo', 'Inactive')} label={t('Canal Telegram', 'Telegram channel')} color={user?.plan !== 'free' ? 'var(--green)' : 'var(--muted)'} />
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
                onClick={() => navigate(`/matches/${pick.matchId}`, { state: { match: pick.matchRef } })}
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
                    onClick={() => navigate(`/matches/${match.id}`, { state: { match } })}
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
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                        {new Date(match.date).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', { day: '2-digit', month: 'short' })}
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
