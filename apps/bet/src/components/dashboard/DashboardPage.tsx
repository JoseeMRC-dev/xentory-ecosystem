import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { fetchUpcomingMatches, getMockMatchesBySport } from '../../services/sportsService';
import { SPORT_CONFIG, confidenceColor } from '../../constants';
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

const TODAY_PICKS = [
  { sport: '⚽', match: 'Real Madrid vs Barcelona', competition: 'La Liga', pick: 'Real Madrid gana', confidence: 74, odds: 1.85, market: '1X2' },
  { sport: '🏀', match: 'Lakers vs Celtics', competition: 'NBA', pick: 'Over 224.5', confidence: 68, odds: 1.91, market: 'Over/Under' },
  { sport: '🎾', match: 'Alcaraz vs Sinner', competition: 'ATP Madrid', pick: 'Alcaraz gana', confidence: 72, odds: 1.65, market: 'Resultado' },
];

function StatCard({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) {
  return (
    <div className="glass" style={{ borderRadius: 14, padding: '1.4rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', fontSize: '1.4rem', opacity: 0.4 }}>{icon}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>{label}</div>
      <div style={{ fontFamily: 'Urbanist', fontWeight: 800, fontSize: '2rem', color, letterSpacing: '-0.04em' }}>{value}</div>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);

  useEffect(() => {
    // Load upcoming matches from Champions + La Liga
    Promise.all([fetchUpcomingMatches(2, 3), fetchUpcomingMatches(140, 3)])
      .then(([cl, ll]) => setUpcomingMatches([...cl, ...ll].slice(0, 6)));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 1100, width: '100%' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>
          {greeting}, <span className="text-gradient-gold">{user?.name.split(' ')[0]}</span> 👋
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Aquí tienes las mejores predicciones del día generadas por IA.</p>
      </div>

      {/* Stats */}
      <div className="bet-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard icon="🎯" value="3" label="Picks del día" color="var(--gold)" />
        <StatCard icon="✅" value="68%" label="Acierto semanal" color="var(--green)" />
        <StatCard icon="⚽🏀🎾" value="5" label="Deportes activos" color="var(--cyan)" />
        <StatCard icon="✈️" value={user?.plan !== 'free' ? 'Activo' : 'Inactivo'} label="Canal Telegram" color={user?.plan !== 'free' ? 'var(--green)' : 'var(--muted)'} />
      </div>

      {/* Best bets of the day */}
      <div className="bet-dash-main-grid" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

        <div className="glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h2 style={{ fontSize: '1rem' }}>🎯 Mejores picks del día</h2>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span className="live-dot" /> Actualizado hoy
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {TODAY_PICKS.map((pick, i) => (
              <div
                key={i}
                onClick={() => navigate('/matches')}
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
                  <div style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '0.88rem', color: confidenceColor(pick.confidence) }}>
                    {pick.confidence}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gold)' }}>@{pick.odds}</div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => navigate('/analysis')} className="btn btn-gold" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>
            🧠 Generar análisis completo
          </button>
        </div>

        {/* Upcoming matches */}
        <div className="glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h2 style={{ fontSize: '1rem' }}>📅 Upcoming matches</h2>
            <button onClick={() => navigate('/matches')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', fontSize: '0.78rem' }}>View alls →</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {upcomingMatches.length === 0
              ? Array(4).fill(0).map((_, i) => (
                  <div key={i} style={{ height: 56, borderRadius: 10, background: 'var(--card2)' }} className="skeleton" />
                ))
              : upcomingMatches.slice(0, 5).map(match => (
                  <div
                    key={match.id}
                    onClick={() => navigate(`/matches/${match.id}`)}
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
                        {new Date(match.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
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
        <h2 style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>⚽ Competiciones de fútbol</h2>
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
        <h2 style={{ fontSize: '1rem', marginBottom: '1.2rem' }}>🏆 Acceso rápido por deporte</h2>
        <div className="bet-sports-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.8rem' }}>
          {Object.entries(SPORT_CONFIG).map(([key, cfg]) => (
            <div
              key={key}
              onClick={() => navigate(`/matches?sport=${key}`)}
              style={{
                padding: '1.2rem 0.8rem', borderRadius: 12, textAlign: 'center',
                background: 'var(--card2)', border: '1px solid var(--border)',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = cfg.color; e.currentTarget.style.background = `${cfg.color}08`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--card2)'; }}
            >
              <div style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>{cfg.emoji}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text2)', fontWeight: 500 }}>{cfg.label}</div>
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
            <div style={{ fontFamily: 'Urbanist', fontWeight: 700, marginBottom: '0.2rem' }}>
              🚀 Upgrade to Pro Plan — Full analysis across all sports
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
              Over/Under · BTTS · Hándicap · Canal Telegram · Todos los deportes desde 29€/mes
            </div>
          </div>
          <button className="btn btn-gold" style={{ flexShrink: 0, marginLeft: '1rem' }}>Ver planes →</button>
        </div>
      )}
    </div>
  );
}
